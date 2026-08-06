/**
 * 格式化工具 —— 日期 / 分数 / 杯测报告降级解析
 */
import type { CupNoteReport, FallbackReport, StrengthPoint, WeaknessPoint } from '@/types/report';
import type { InterviewMode } from '@/types/interview';
import { modeToChinese } from './constants';

/** 时间戳/ISO 字符串 → yyyy-MM-dd HH:mm */
export function formatDateTime(value: string | number | Date): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 时间戳/ISO 字符串 → yyyy-MM-dd */
export function formatDate(value: string | number | Date): string {
  return formatDateTime(value).slice(0, 10);
}

/**
 * 报告解析降级策略（接口协调关键点）：
 * 后端 ReportGeneratorTool 按契约输出结构化 JSON（score/summary/strengths/weaknesses/suggestions），
 * 但 LLM 可能用 Markdown 代码块包裹或字段名漂移，故解析顺序为：
 *   1. 对象直接映射（字段名容错：兼容 score|totalScore 等别名）
 *   2. 字符串先剥离代码块再 JSON.parse，成功则走对象映射
 *   3. 失败则从文本启发式提取，构造可渲染报告
 */
export function normalizeReport(
  payload: string | Record<string, unknown>,
  sessionId: string,
  mode: InterviewMode,
  totalRounds: number,
): CupNoteReport | FallbackReport {
  const createdAt = new Date().toISOString();

  if (typeof payload === 'object') {
    return fromJsonObject(payload, sessionId, mode, totalRounds, createdAt, false);
  }

  const text = payload.trim();
  // LLM 常把 JSON 包在 ```json ... ``` 里，先剥离再尝试结构化解析
  const stripped = stripCodeFence(text);
  const parsed = tryParseJson(stripped);
  if (parsed) {
    return fromJsonObject(parsed, sessionId, mode, totalRounds, createdAt, false);
  }

  // 纯自由文本：启发式提取
  return {
    sessionId,
    mode,
    createdAt,
    totalRounds,
    score: extractScore(text),
    summary: extractSection(text, ['总体评价', '总结', 'summary']) ?? text.slice(0, 200),
    strengths: extractBulletList(text, ['优点', '优势', 'strengths']).map((t) => ({
      topic: t,
      comment: '',
    })),
    weaknesses: extractBulletList(text, ['弱点', '薄弱', '不足', 'weaknesses']).map((t) => ({
      topic: t,
      comment: '',
      suggestion: '',
    })),
    suggestions: extractBulletList(text, ['建议', '改进', 'suggestions']),
    rawText: text,
  };
}

/** JSON 对象 → 结构化报告；字段名容错（接受常见别名），数组元素兼容字符串/对象 */
function fromJsonObject(
  payload: Record<string, unknown>,
  sessionId: string,
  mode: InterviewMode,
  totalRounds: number,
  createdAt: string,
  fallback: boolean,
): CupNoteReport | FallbackReport {
  const base = {
    sessionId: String(pickField(payload, ['sessionId']) ?? sessionId),
    mode: (pickField(payload, ['mode']) as InterviewMode) ?? mode,
    createdAt: String(pickField(payload, ['createdAt']) ?? createdAt),
    totalRounds: Number(pickField(payload, ['totalRounds']) ?? totalRounds),
    score: toScore(pickField(payload, ['score', 'totalScore', 'overallScore', 'total_score', 'overall_score'])),
    summary: String(pickField(payload, ['summary', 'overall', 'conclusion', 'overallComment']) ?? ''),
    strengths: toStrengthPoints(pickField(payload, ['strengths', 'advantages', 'strongAreas', 'strongPoints', 'strengthPoints'])),
    weaknesses: toWeaknessPoints(pickField(payload, ['weaknesses', 'disadvantages', 'improvements', 'weakPoints', 'weaknessPoints'])),
    suggestions: toStringArray(pickField(payload, ['suggestions', 'advice', 'recommendations', 'nextSteps', 'actions'])),
  };
  if (fallback) return { ...base, rawText: JSON.stringify(payload) };
  return base;
}

/** 剥离 Markdown 代码块（```json ... ``` 或 ``` ... ```） */
function stripCodeFence(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (match?.[1] ?? text).trim();
}

/** 尝试解析 JSON 字符串，失败返回 null（字符串视为非 JSON） */
function tryParseJson(text: string): Record<string, unknown> | null {
  if (!text.startsWith('{')) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** 取对象中第一个命中的 key 的值 */
function pickField(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

/** 评分容错：数字或 "85" 字符串 */
function toScore(value: unknown): number {
  if (typeof value === 'number') return Math.min(100, Math.max(0, Math.round(value)));
  if (typeof value === 'string') {
    const n = Number(value.replace(/[^0-9]/g, ''));
    return Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
  }
  return 0;
}

/** 优势点容错：string[] → [{topic, comment}]；[{topic, comment}] 原样 */
function toStrengthPoints(value: unknown): StrengthPoint[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): StrengthPoint | null => {
      if (typeof item === 'string') return { topic: item, comment: '' };
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        return { topic: String(o.topic ?? ''), comment: String(o.comment ?? '') };
      }
      return null;
    })
    .filter((x): x is StrengthPoint => x !== null && x.topic !== '');
}

/** 薄弱点容错：string[] → [{topic, comment, suggestion}]；[{topic, comment, suggestion}] 原样 */
function toWeaknessPoints(value: unknown): WeaknessPoint[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): WeaknessPoint | null => {
      if (typeof item === 'string') return { topic: item, comment: '', suggestion: '' };
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        return {
          topic: String(o.topic ?? ''),
          comment: String(o.comment ?? ''),
          suggestion: String(o.suggestion ?? o.improvement ?? ''),
        };
      }
      return null;
    })
    .filter((x): x is WeaknessPoint => x !== null && x.topic !== '');
}

/** 字符串数组容错：string[] 原样；单个字符串 → [它] */
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter((v) => v.trim() !== '');
  }
  if (typeof value === 'string') {
    const cleaned = value.trim();
    return cleaned ? [cleaned] : [];
  }
  return [];
}

/** 从文本中提取评分（0-100） */
function extractScore(text: string): number {
  const match = text.match(/评分\s*[:：]?\s*(\d{1,3})/);
  const value = match ? Number(match[1]) : 0;
  return Math.min(100, Math.max(0, value));
}

/** 提取指定标题后的条目列表（每行一条，去掉 -/•/数字前缀） */
function extractBulletList(text: string, sectionNames: string[]): string[] {
  const lines = text.split('\n');
  let capturing = false;
  const items: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (capturing) {
      if (/^[A-Za-z\u4e00-\u9fa5]{2,}\s*[:：]/.test(line) && !/^[-•·\d.]/.test(line)) {
        capturing = false;
        continue;
      }
      const cleaned = line.replace(/^[-•·*\d.、\s]+/, '').trim();
      if (cleaned && !items.includes(cleaned)) items.push(cleaned);
      continue;
    }
    if (sectionNames.some((name) => line.includes(name))) {
      capturing = true;
    }
  }
  return items;
}

/** 提取指定标题后的段落文本 */
function extractSection(text: string, sectionNames: string[]): string | null {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (sectionNames.some((name) => lines[i].includes(name))) {
      return lines[i + 1]?.trim() ?? null;
    }
  }
  return null;
}

/** 报告页展示用：模式中文名 */
export function reportModeLabel(mode: InterviewMode | string): string {
  return modeToChinese(mode);
}
