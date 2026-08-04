/**
 * useSSE —— 面试 SSE 流式会话 Hook（规范文档 7.4）
 *
 * 后端协议（已核实 InterviewAgent / SseEmitterHandler / DeepDiveWorkflow）：
 *   question  → LLM 流式分片，每片独立事件，需拼接为一条面试官消息
 *   message   → LLM 流式分片（回答后的评价/追问），同上拼接
 *   report    → LLM 流式分片，拼接后整体交给 normalizeReport 降级解析
 *   complete  → 阶段结束（data 为 "{}"）：拼接中的消息固化，等待用户输入
 *   error     → 服务端错误
 */
import { useEffect, useRef } from 'react';
import { SseClient, parseReportPayload } from '@/api/sse';
import { useInterviewStore } from '@/stores/interviewStore';
import { normalizeReport } from '@/utils/format';

export type SseStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'error';

interface UseSseOptions {
  /** 是否启用连接（start 成功后置 true） */
  enabled: boolean;
  /** 连接/重连状态变化回调 */
  onStatusChange?: (status: SseStatus) => void;
  /** 服务端 error 事件回调 */
  onError?: (message: string) => void;
}

export function useSSE({ enabled, onStatusChange, onError }: UseSseOptions) {
  const sessionId = useInterviewStore((s) => s.sessionId);
  const mode = useInterviewStore((s) => s.mode);
  const totalRounds = useInterviewStore((s) => s.maxRounds);

  // 保存回调的最新引用，避免重复连接
  const onStatusChangeRef = useRef(onStatusChange);
  const onErrorRef = useRef(onError);
  onStatusChangeRef.current = onStatusChange;
  onErrorRef.current = onError;

  // 正在流式输出中的"进行中消息"标记（存于 store 的 isStreaming）
  // report 分片缓冲：complete 事件到达时统一解析
  const reportBuffer = useRef('');
  const reporting = useRef(false);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    reportBuffer.current = '';
    reporting.current = false;

    const client = new SseClient({
      sessionId,
      onEvent: (event) => {
        const store = useInterviewStore.getState();

        switch (event.type) {
          case 'question':
          case 'message': {
            if (reporting.current) break; // 报告阶段忽略 question/message
            const state = useInterviewStore.getState();
            const last = state.messages[state.messages.length - 1];
            const isAppending = last?.role === 'interviewer' && state.isStreaming;
            state.setStreaming(true);
            if (isAppending) {
              state.appendToLastMessage(event.data);
            } else {
              state.addMessage('interviewer', event.data);
            }
            break;
          }

          case 'report': {
            reporting.current = true;
            reportBuffer.current += event.data;
            break;
          }

          case 'complete': {
            // 报告阶段结束：拼接 buffer 并解析
            if (reporting.current && reportBuffer.current) {
              const payload = parseReportPayload(reportBuffer.current);
              const report = normalizeReport(payload, sessionId, mode ?? 'LATTE', totalRounds);
              store.setReport(report);
              // 同步到本地历史（后端暂无历史接口，localStorage 兜底）
              store.addToHistory(report);
              reportBuffer.current = '';
              reporting.current = false;
            } else {
              // 普通问题阶段结束：固化流式消息，等待用户输入
              store.setStreaming(false);
            }
            break;
          }

          case 'error': {
            store.setStreaming(false);
            onErrorRef.current?.(event.data);
            break;
          }
        }
      },
      onStatusChange: (status) => onStatusChangeRef.current?.(status),
    });

    client.connect();
    return () => {
      reportBuffer.current = '';
      reporting.current = false;
      client.disconnect();
    };
  }, [enabled, sessionId, mode, totalRounds]);
}
