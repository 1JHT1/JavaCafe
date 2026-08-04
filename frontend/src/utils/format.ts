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
 * 后端 generateReport 的 report 事件推送的是 LLM 自由文本，并非规范中的 CupNoteReport JSON。
 * 优先尝试 JSON 解析；失败时从文本中启发式提取评分/优点/弱点/建议，构造可渲染报告。
 */
export function normalizeReport(
  payload: string | Record<string, unknown>,
  sessionId: string,
  mode: InterviewMode,
  totalRounds: number,
): CupNoteReport | FallbackReport {
  const createdAt = new Date().toISOString();

  if (typeof payload === 'object') {
    return {
      sessionId: String(payload.sessionId ?? sessionId),
      mode: (payload.mode as InterviewMode) ?? mode,
      createdAt: String(payload.createdAt ?? createdAt),
      totalRounds: Number(payload.totalRounds ?? totalRounds),
      score: Number(payload.score ?? 0),
      summary: String(payload.summary ?? ''),
      strengths: (payload.strengths as StrengthPoint[]) ?? [],
      weaknesses: (payload.weaknesses as WeaknessPoint[]) ?? [],
      suggestions: (payload.suggestions as string[]) ?? [],
    };
  }

  const text = payload.trim();
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
