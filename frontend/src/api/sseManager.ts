/**
 * sseManager —— 全局 SSE 连接管理器（模块级单例）
 *
 * 目标：SSE 连接生命周期脱离页面组件 —— 页面切换（组件卸载/重挂载）只做
 * 订阅/退订，连接保持不断；只有会话真正结束时才关闭连接：
 *   1) 报告生成完成（complete 事件收尾后）
 *   2) 用户主动取消面试（useInterview.cancelInterview 显式调用 closeSse）
 *   3) SseClient 内部 3 次重连失败自毁（此处同步清理引用）
 *
 * 会话级状态（report 分片缓冲 / 当前流类型 / 连接状态）同样挂在 manager 上，
 * 跨组件存活：切页面期间 AI 输出的分片事件持续写入 store，切回时消息完整。
 */
import { SseClient, parseReportPayload } from './sse';
import type { SseEvent } from './types';
import { useInterviewStore } from '@/stores/interviewStore';
import { normalizeReport } from '@/utils/format';
import type { InterviewMode } from '@/types/interview';

/** SSE 连接状态（比 SseClient 内部状态多一个 idle：尚未建立连接） */
export type SseStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'error';

/** 订阅者回调（仅 UI 反馈；事件 → store 的写入在 manager 内完成） */
interface SseHandlers {
  onStatusChange?: (status: SseStatus) => void;
  onError?: (message: string) => void;
}

interface ManagedSession {
  client: SseClient;
  mode: InterviewMode;
  status: SseStatus;
  handlers: Set<SseHandlers>;
  /** report 分片缓冲：complete 事件到达时统一解析 */
  reportBuffer: string;
  /** 正在接收 report 流 */
  reporting: boolean;
  /** 最近一次完成的流类型：question=第 1 题，message=AI 提出的下一题 */
  lastStreamType: 'question' | 'message' | null;
  /** 已处理的最大事件序号（重连重放去重基准；持久化于 store，刷新后恢复） */
  lastSeq: number;
}

const sessions = new Map<string, ManagedSession>();

function broadcast(session: ManagedSession, status?: SseStatus, error?: string): void {
  for (const handler of session.handlers) {
    if (status) handler.onStatusChange?.(status);
    if (error) handler.onError?.(error);
  }
}

/**
 * 订阅一个会话的事件流。
 * 已有连接则复用（页面切换场景，连接由 manager 保持不断），否则新建并连接。
 * 返回退订函数：仅移除处理器，不关闭连接。
 */
export function subscribeSse(
  sessionId: string,
  mode: InterviewMode,
  handlers: SseHandlers,
): () => void {
  let session = sessions.get(sessionId);
  if (!session) {
    const newSession: ManagedSession = {
      client: new SseClient({
        sessionId,
        onEvent: (event) => handleEvent(sessionId, event),
        onStatusChange: (status) => {
          // 重连耗尽：SseClient 已自毁连接，清理引用避免复用死连接
          if (status === 'error') sessions.delete(sessionId);
          newSession.status = status;
          broadcast(newSession, status);
        },
      }),
      mode,
      status: 'connecting',
      handlers: new Set(),
      reportBuffer: '',
      reporting: false,
      lastStreamType: null,
      // 从持久化会话恢复已处理序号：刷新后重连，重放中 seq ≤ lastSeq 的事件跳过
      lastSeq: useInterviewStore.getState().sessions[mode].lastEventSeq ?? 0,
    };
    sessions.set(sessionId, newSession);
    session = newSession;
    // connect() 才可能触发事件回调，此时 newSession 已初始化完成
    newSession.client.connect();
  }
  session.handlers.add(handlers);
  // 让新订阅者立即感知当前连接状态（切回页面时 UI 不再从 idle 开始）
  handlers.onStatusChange?.(session.status);

  return () => {
    const current = sessions.get(sessionId);
    if (!current) return;
    current.handlers.delete(handlers);
  };
}

/**
 * 关闭会话连接（会话真正结束：报告完成 / 用户取消）。
 * 内部 client.disconnect() 会广播 'closed' 给所有订阅者。
 */
export function closeSse(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.client.disconnect();
  sessions.delete(sessionId);
}

/** 事件 → store 写入（会话级状态存于 manager，组件卸载期间持续生效） */
function handleEvent(sessionId: string, event: SseEvent): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  const store = useInterviewStore.getState();
  const mode = session.mode;

  // 重连重放去重：后端 replay sink 会重放缓存事件（带会话内序号 seq），
  // 已处理过（seq ≤ lastSeq）的旧事件跳过；新序号记录并持久化，供下次刷新恢复
  if (event.seq != null) {
    if (event.seq <= session.lastSeq) return;
    session.lastSeq = event.seq;
    store.setLastEventSeq(mode, event.seq);
  }

  switch (event.type) {
    case 'question':
    case 'message': {
      if (session.reporting) break; // 报告阶段忽略 question/message
      session.lastStreamType = event.type;
      const current = store.sessions[mode];
      const last = current.messages[current.messages.length - 1];
      const isAppending = last?.role === 'interviewer' && current.isStreaming;
      store.setStreaming(mode, true);
      if (isAppending) {
        store.appendToLastMessage(mode, event.data);
      } else {
        store.addMessage(mode, 'interviewer', event.data);
      }
      break;
    }

    case 'report': {
      session.reporting = true;
      session.reportBuffer += event.data;
      // 标记报告生成中：刷新后据此恢复已落库报告（见 interviewStore onRehydrateStorage）
      store.setReportPending(mode, true);
      break;
    }

    case 'complete': {
      // 报告阶段结束：拼接 buffer 并解析
      if (session.reporting && session.reportBuffer) {
        const payload = parseReportPayload(session.reportBuffer);
        // 实际出题轮数：AI 已提出的题数（currentRound），至少 1 轮
        const actualRounds = Math.max(store.sessions[mode].currentRound, 1);
        const report = normalizeReport(payload, sessionId, mode, actualRounds);
        store.setReport(mode, report);
        // 报告已收齐，清除生成中标记（刷新恢复逻辑不再干预）
        store.setReportPending(mode, false);
        // 同步到本地历史（后端暂无历史接口，localStorage 兜底）
        store.addToHistory(report);
        session.reportBuffer = '';
        session.reporting = false;
        // 会话已结束：关闭连接（setReport 使 isActive=false，组件随后退订）
        closeSse(sessionId);
      } else {
        // 普通问题阶段结束：固化流式消息
        store.setStreaming(mode, false);
        // 轮次 = AI 出题数：AI 每提出一道题（question 或 message）计一轮
        if (session.lastStreamType) {
          store.incrementRound(mode);
          session.lastStreamType = null;
        }
      }
      break;
    }

    case 'error': {
      store.setStreaming(mode, false);
      broadcast(session, undefined, event.data);
      break;
    }
  }
}
