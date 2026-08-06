/**
 * useInterview —— 面试流程编排 Hook
 *
 * 串联：开始面试（POST /api/interview/{mode}）→ SSE 流式对话（useSSE）
 *      → 提交回答（POST /api/interview/answer）→ 结束并生成报告（POST /api/interview/{sessionId}/end）
 */
import { useCallback, useState } from 'react';
import { interviewApi } from '@/api/interview';
import { useInterviewStore } from '@/stores/interviewStore';
import { pathToEnum } from '@/utils/constants';
import { useSSE, type SseStatus } from './useSSE';

export interface UseInterviewOptions {
  /** 是否在 mount 时自动开始（预留） */
  autoStart?: boolean;
  /** 简历 ID（手冲模式） */
  resumeId?: string;
}

export function useInterview(modePath: string, options: UseInterviewOptions = {}) {
  const mode = pathToEnum(modePath);
  const resumeId = options.resumeId;

  // 读写 store 中该咖啡模式独立的会话分区
  const session = useInterviewStore((s) => s.sessions[mode]);
  const sessionId = session.sessionId;
  const isActive = session.isActive;
  const isStreaming = session.isStreaming;
  const messages = session.messages;
  const currentRound = session.currentRound;
  const report = session.report;

  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [sseStatus, setSseStatus] = useState<SseStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // SSE 连接：sessionId 就绪且会话激活时自动建立（按 mode 分区）
  useSSE({
    mode,
    enabled: isActive && !!sessionId,
    onStatusChange: setSseStatus,
    onError: setError,
  });

  /** 开始面试 */
  const startInterview = useCallback(async (): Promise<void> => {
    const store = useInterviewStore.getState();
    setStarting(true);
    setError(null);
    try {
      const body = {
        mode,
        ...(resumeId ? { resumeId } : {}),
      };
      const newSessionId = await interviewApi.start(modePath, body);
      store.initSession(mode, newSessionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '开始面试失败，请确认后端服务已启动');
    } finally {
      setStarting(false);
    }
  }, [modePath, mode, resumeId]);

  /** 提交回答；返回是否提交成功（供 UI 触发爱心拉花等反馈） */
  const submitAnswer = useCallback(async (answer: string): Promise<boolean> => {
    const store = useInterviewStore.getState();
    const currentSessionId = store.sessions[mode].sessionId;
    if (!currentSessionId || !answer.trim()) return false;

    setSending(true);
    setError(null);
    store.addMessage(mode, 'user', answer.trim());
    store.setStreaming(mode, true);
    try {
      await interviewApi.answer({ sessionId: currentSessionId, answer: answer.trim() });
      return true;
    } catch (e) {
      store.setStreaming(mode, false);
      setError(e instanceof Error ? e.message : '提交回答失败');
      return false;
    } finally {
      setSending(false);
    }
  }, [mode]);

  /** 结束面试，触发报告生成（报告经 SSE 推送，无需等待 HTTP 返回） */
  const endInterview = useCallback(async (): Promise<void> => {
    const store = useInterviewStore.getState();
    const currentSessionId = store.sessions[mode].sessionId;
    if (!currentSessionId) return;

    setEnding(true);
    setError(null);
    store.setStreaming(mode, true); // 显示"生成报告中"状态
    try {
      await interviewApi.end(currentSessionId);
    } catch (e) {
      store.setStreaming(mode, false);
      setEnding(false);
      setError(e instanceof Error ? e.message : '结束面试失败');
    }
  }, [mode]);

  /** 取消面试：放弃当前会话（不生成报告），本地重置后由页面跳回点单页重新开始 */
  const cancelInterview = useCallback(async (): Promise<void> => {
    const store = useInterviewStore.getState();
    const currentSessionId = store.sessions[mode].sessionId;
    if (currentSessionId) {
      try {
        await interviewApi.cancel(currentSessionId);
      } catch {
        // 后端不可达时忽略：本地照常重置会话，SSE 随 isActive=false 断开
      }
    }
    store.reset(mode);
  }, [mode]);

  /** 清空错误（供 UI 关闭提示） */
  const clearError = useCallback(() => setError(null), []);

  return {
    // 状态
    sessionId,
    isActive,
    isStreaming,
    messages,
    currentRound,
    report,
    starting,
    sending,
    ending,
    sseStatus,
    error,
    // 动作
    startInterview,
    submitAnswer,
    endInterview,
    cancelInterview,
    clearError,
  };
}
