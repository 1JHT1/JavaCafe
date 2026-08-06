/**
 * 面试会话状态（规范文档 7.1）—— 按咖啡模式（mode）隔离
 *
 * 每种咖啡（手冲/美式/拿铁/当季特调）拥有独立的会话状态
 * （sessionId / messages / isActive / report 等），互不串扰；
 * 切换咖啡页面时各自的对话记录保留，重新进入同一咖啡可续聊。
 * history（报告历史）为全局列表（localStorage 兜底）。
 */
import { create } from 'zustand';
import type { ChatMessage, InterviewMode } from '@/api/types';
import type { CupNoteReport, FallbackReport } from '@/types/report';
import { STORAGE_KEYS } from '@/utils/constants';
import { historyApi } from '@/api/history';

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

/** 单个咖啡模式（一种咖啡）的会话状态 */
export interface ModeSession {
  sessionId: string | null;
  isActive: boolean;
  /** AI 正在输出中 */
  isStreaming: boolean;
  /** 对话列表 */
  messages: ChatMessage[];
  /** 轮次 = AI 已提出的题目数（第 1 题起即 1） */
  currentRound: number;
  report: InterviewReport | null;
}

function emptyModeSession(): ModeSession {
  return {
    sessionId: null,
    isActive: false,
    isStreaming: false,
    messages: [],
    currentRound: 0,
    report: null,
  };
}

/** 四种咖啡各自的初始会话 */
const EMPTY_SESSIONS: Record<InterviewMode, ModeSession> = {
  POUR_OVER: emptyModeSession(),
  AMERICANO: emptyModeSession(),
  LATTE: emptyModeSession(),
  SPECIAL: emptyModeSession(),
};

interface InterviewState {
  /** 按咖啡模式分区的会话状态 */
  sessions: Record<InterviewMode, ModeSession>;
  /** 历史报告列表（localStorage 兜底） */
  history: InterviewReport[];

  // Actions（均需显式指定 mode，操作对应咖啡的会话分区）
  initSession: (mode: InterviewMode, sessionId: string) => void;
  addMessage: (mode: InterviewMode, role: ChatMessage['role'], content: string) => void;
  /** 流式追加到最后一条消息 */
  appendToLastMessage: (mode: InterviewMode, chunk: string) => void;
  setStreaming: (mode: InterviewMode, streaming: boolean) => void;
  incrementRound: (mode: InterviewMode) => void;
  setReport: (mode: InterviewMode, report: InterviewReport) => void;
  /** 报告完成后写入本地历史 */
  addToHistory: (report: InterviewReport) => void;
  /** 从本地历史移除一条报告（删除记录后同步清理缓存） */
  removeFromHistory: (sessionId: string) => void;
  /** 清空本地历史缓存（退出登录时调用，防止上一用户记录泄露） */
  resetHistory: () => void;
  /** 从后端拉取历史会话并合并（接口优先，失败静默保留本地） */
  fetchHistory: () => Promise<void>;
  /** 重置某个咖啡的会话 */
  reset: (mode: InterviewMode) => void;
}

let messageSeq = 0;

export const useInterviewStore = create<InterviewState>((set) => ({
  sessions: EMPTY_SESSIONS,
  history: loadHistory(),

  initSession: (mode, sessionId) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [mode]: {
          ...state.sessions[mode],
          sessionId,
          isActive: true,
          isStreaming: false,
          currentRound: 0,
          messages: [],
          report: null,
        },
      },
    })),

  addMessage: (mode, role, content) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [mode]: {
          ...state.sessions[mode],
          messages: [
            ...state.sessions[mode].messages,
            {
              id: `msg-${Date.now()}-${messageSeq++}`,
              role,
              content,
              timestamp: Date.now(),
            },
          ],
        },
      },
    })),

  appendToLastMessage: (mode, chunk) =>
    set((state) => {
      const session = state.sessions[mode];
      if (session.messages.length === 0) return state;
      const updated = [...session.messages];
      const last = updated[updated.length - 1];
      updated[updated.length - 1] = { ...last, content: last.content + chunk };
      return { sessions: { ...state.sessions, [mode]: { ...session, messages: updated } } };
    }),

  setStreaming: (mode, isStreaming) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [mode]: { ...state.sessions[mode], isStreaming },
      },
    })),

  incrementRound: (mode) =>
    set((state) => {
      const session = state.sessions[mode];
      return {
        sessions: {
          ...state.sessions,
          [mode]: {
            ...session,
            currentRound: session.currentRound + 1,
          },
        },
      };
    }),

  setReport: (mode, report) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [mode]: { ...state.sessions[mode], report, isActive: false },
      },
    })),

  addToHistory: (report) =>
    set((state) => {
      const next = [report, ...state.history].slice(0, MAX_HISTORY);
      persistHistory(next);
      return { history: next };
    }),

  removeFromHistory: (sessionId) =>
    set((state) => {
      const next = state.history.filter((r) => r.sessionId !== sessionId);
      persistHistory(next);
      return { history: next };
    }),

  resetHistory: () => {
    localStorage.removeItem(STORAGE_KEYS.reportHistory);
    set({ history: [] });
  },

  fetchHistory: async () => {
    try {
      const remote = await historyApi.getHistory();
      const remoteReports: InterviewReport[] = remote.map((s) => ({
        sessionId: s.sessionId,
        mode: s.mode,
        createdAt: s.createdAt,
        totalRounds: s.totalRounds,
        score: s.score,
        summary: s.summary,
        strengths: [],
        weaknesses: [],
        suggestions: [],
      }));
      set((state) => {
        // 接口列表优先；本地新增但尚未落库的会话追加在末尾，避免刚完成的报告丢失
        const remoteIds = new Set(remoteReports.map((r) => r.sessionId));
        const merged = [...remoteReports];
        for (const r of state.history) {
          // 与后端 sessionId 一致的会话：已同步，丢弃本地副本，避免重复
          if (remoteIds.has(r.sessionId)) continue;
          // 兼容修复前的脏数据：旧版本后端落库主键与前端 sessionId 不同，
          // 同一场面试在后端与本地各存一条；以 mode + totalRounds + score 判定
          // 为同一场面试，丢弃本地旧副本（后端记录保留，不丢数据）
          const isOldDup = remoteReports.some(
            (m) => m.mode === r.mode && m.totalRounds === r.totalRounds && m.score === r.score,
          );
          if (isOldDup) continue;
          merged.push(r);
        }
        persistHistory(merged);
        return { history: merged };
      });
    } catch {
      // 后端不可用时静默保留本地历史
    }
  },

  reset: (mode) =>
    set((state) => ({
      sessions: { ...state.sessions, [mode]: emptyModeSession() },
    })),
}));
