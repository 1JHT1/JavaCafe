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
