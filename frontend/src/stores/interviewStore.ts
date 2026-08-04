/**
 * 面试会话状态（规范文档 7.1）
 *
 * 协调说明：后端暂无历史记录接口，报告完成后通过 addToHistory
 * 写入 localStorage 兜底；等后端提供 GET /api/interview/history 后切换。
 */
import { create } from 'zustand';
import type { ChatMessage, InterviewMode } from '@/api/types';
import type { CupNoteReport, FallbackReport } from '@/types/report';
import { STORAGE_KEYS } from '@/utils/constants';

export type InterviewReport = CupNoteReport | FallbackReport;

/** 本地历史列表（最新在前，最多 50 条） */
const MAX_HISTORY = 50;

function loadHistory(): InterviewReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.reportHistory);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as InterviewReport[]) : [];
  } catch {
    return [];
  }
}

function persistHistory(history: InterviewReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.reportHistory, JSON.stringify(history));
  } catch {
    // localStorage 不可用时静默降级（如隐私模式）
  }
}

interface InterviewState {
  // 会话信息
  sessionId: string | null;
  mode: InterviewMode | null;
  isActive: boolean;
  /** AI 正在输出中 */
  isStreaming: boolean;

  // 对话列表
  messages: ChatMessage[];
  currentRound: number;
  maxRounds: number;

  // 报告
  report: InterviewReport | null;
  /** 历史报告列表（localStorage 兜底） */
  history: InterviewReport[];

  // Actions
  initSession: (sessionId: string, mode: InterviewMode, maxRounds: number) => void;
  addMessage: (role: ChatMessage['role'], content: string) => void;
  /** 流式追加到最后一条消息 */
  appendToLastMessage: (chunk: string) => void;
  setStreaming: (streaming: boolean) => void;
  incrementRound: () => void;
  setReport: (report: InterviewReport) => void;
  /** 报告完成后写入本地历史 */
  addToHistory: (report: InterviewReport) => void;
  reset: () => void;
}

let messageSeq = 0;

export const useInterviewStore = create<InterviewState>((set) => ({
  sessionId: null,
  mode: null,
  isActive: false,
  isStreaming: false,
  messages: [],
  currentRound: 0,
  maxRounds: 10,
  report: null,
  history: loadHistory(),

  initSession: (sessionId, mode, maxRounds) =>
    set({
      sessionId,
      mode,
      maxRounds,
      isActive: true,
      currentRound: 0,
      messages: [],
      report: null,
    }),

  addMessage: (role, content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: `msg-${Date.now()}-${messageSeq++}`,
          role,
          content,
          timestamp: Date.now(),
        },
      ],
    })),

  appendToLastMessage: (chunk) =>
    set((state) => {
      if (state.messages.length === 0) return state;
      const updated = [...state.messages];
      const last = updated[updated.length - 1];
      updated[updated.length - 1] = { ...last, content: last.content + chunk };
      return { messages: updated };
    }),

  setStreaming: (isStreaming) => set({ isStreaming }),

  incrementRound: () =>
    set((state) => ({
      currentRound: Math.min(state.currentRound + 1, state.maxRounds),
    })),

  setReport: (report) => set({ report, isActive: false }),

  addToHistory: (report) =>
    set((state) => {
      const next = [report, ...state.history].slice(0, MAX_HISTORY);
      persistHistory(next);
      return { history: next };
    }),

  reset: () =>
    set((state) => ({
      sessionId: null,
      mode: null,
      isActive: false,
      isStreaming: false,
      messages: [],
      currentRound: 0,
      maxRounds: 10,
      report: null,
      history: state.history,
    })),
}));
