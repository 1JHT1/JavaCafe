/**
 * useInterview —— 面试流程编排 Hook
 *
 * 串联：开始面试（POST /api/interview/{mode}）→ SSE 流式对话（useSSE）
 *      → 提交回答（POST /api/interview/answer）→ 结束并生成报告（POST /api/interview/{sessionId}/end）
 */
import { useCallback, useState } from 'react';
import { interviewApi } from '@/api/interview';
import { useInterviewStore } from '@/stores/interviewStore';
import { DEFAULT_MAX_ROUNDS, pathToEnum } from '@/utils/constants';
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

  const sessionId = useInterviewStore((s) => s.sessionId);
  const isActive = useInterviewStore((s) => s.isActive);
  const isStreaming = useInterviewStore((s) => s.isStreaming);
  const messages = useInterviewStore((s) => s.messages);
  const currentRound = useInterviewStore((s) => s.currentRound);
  const maxRounds = useInterviewStore((s) => s.maxRounds);
  const report = useInterviewStore((s) => s.report);

  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [sseStatus, setSseStatus] = useState<SseStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // SSE 连接：sessionId 就绪且会话激活时自动建立
  useSSE({
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
        maxRounds: DEFAULT_MAX_ROUNDS,
      };
      const newSessionId = await interviewApi.start(modePath, body);
      store.initSession(newSessionId, mode, DEFAULT_MAX_ROUNDS);
    } catch (e) {
      setError(e instanceof Error ? e.message : '开始面试失败，请确认后端服务已启动');
    } finally {
      setStarting(false);
    }
  }, [modePath, mode, resumeId]);

  /** 提交回答 */
  const submitAnswer = useCallback(async (answer: string): Promise<void> => {
    const store = useInterviewStore.getState();
    const currentSessionId = store.sessionId;
    if (!currentSessionId || !answer.trim()) return;

    setSending(true);
    setError(null);
    store.addMessage('user', answer.trim());
    store.setStreaming(true);
    try {
      await interviewApi.answer({ sessionId: currentSessionId, answer: answer.trim() });
    } catch (e) {
      store.setStreaming(false);
      setError(e instanceof Error ? e.message : '提交回答失败');
    } finally {
      setSending(false);
    }
  }, []);

  /** 结束面试，触发报告生成（报告经 SSE 推送，无需等待 HTTP 返回） */
  const endInterview = useCallback(async (): Promise<void> => {
    const store = useInterviewStore.getState();
    const currentSessionId = store.sessionId;
    if (!currentSessionId) return;

    setEnding(true);
    setError(null);
    store.setStreaming(true); // 显示"生成报告中"状态
    try {
      await interviewApi.end(currentSessionId);
    } catch (e) {
      store.setStreaming(false);
      setEnding(false);
      setError(e instanceof Error ? e.message : '结束面试失败');
    }
  }, []);

  /** 清空错误（供 UI 关闭提示） */
  const clearError = useCallback(() => setError(null), []);

  return {
    // 状态
    sessionId,
    isActive,
    isStreaming,
    messages,
    currentRound,
    maxRounds,
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
    clearError,
  };
}
