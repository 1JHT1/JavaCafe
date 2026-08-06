/**
 * 杯测报告类型 —— 与后端 javacafe-api 模块 CupNoteReport DTO 对齐
 */
import type { InterviewMode } from './interview';

/** 优势点（后端 CupNoteReport.StrengthPoint） */
export interface StrengthPoint {
  topic: string;
  comment: string;
}

/** 薄弱点（后端 CupNoteReport.WeaknessPoint） */
export interface WeaknessPoint {
  topic: string;
  comment: string;
  suggestion: string;
}

/** 杯测报告（后端 CupNoteReport） */
export interface CupNoteReport {
  sessionId: string;
  mode: InterviewMode;
  createdAt: string;
  totalRounds: number;
  score: number;
  summary: string;
  strengths: StrengthPoint[];
  weaknesses: WeaknessPoint[];
  suggestions: string[];
}

/**
 * 后端 generateReport 通过 SSE 推送的是 LLM 生成的自由文本（非严格 JSON）。
 * 前端解析失败时降级为该结构，保证报告页始终可渲染。
 */
export interface FallbackReport {
  sessionId: string;
  mode: InterviewMode;
  createdAt: string;
  totalRounds: number;
  score: number;
  summary: string;
  strengths: StrengthPoint[];
  weaknesses: WeaknessPoint[];
  suggestions: string[];
  /** 原始 LLM 文本，保留展示 */
  rawText: string;
}

/** 历史会话摘要（后端 SessionSummaryDto），历史页列表项 */
export interface SessionSummary {
  sessionId: string;
  mode: InterviewMode;
  createdAt: string;
  totalRounds: number;
  score: number;
  summary: string;
}

/** 单轮面试问答记录（后端 InterviewRecordDto），历史页"查看对话记录"弹窗数据 */
export interface InterviewRecord {
  sessionId: string;
  /** 面试主题（如 JVM、并发），可能为空 */
  topic: string;
  /** 轮次序号（从 0 开始，展示时 +1） */
  roundNumber: number;
  /** 面试官题目 */
  question: string;
  /** 用户回答 */
  answer: string;
  /** 咖啡师评估 */
  evaluation: string;
  createdAt: string;
}
