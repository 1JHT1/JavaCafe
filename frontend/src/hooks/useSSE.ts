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
import type { InterviewMode } from '@/types/interview';

export type SseStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'error';

interface UseSseOptions {
  /** 咖啡模式：决定读写哪个会话分区（与 store.sessions[mode] 对应） */
  mode: InterviewMode;
  /** 是否启用连接（start 成功后置 true） */
  enabled: boolean;
  /** 连接/重连状态变化回调 */
  onStatusChange?: (status: SseStatus) => void;
  /** 服务端 error 事件回调 */
  onError?: (message: string) => void;
}

export function useSSE({ mode, enabled, onStatusChange, onError }: UseSseOptions) {
  const session = useInterviewStore((s) => s.sessions[mode]);
  const sessionId = session.sessionId;

  // 保存回调的最新引用，避免重复连接
  const onStatusChangeRef = useRef(onStatusChange);
  const onErrorRef = useRef(onError);
  onStatusChangeRef.current = onStatusChange;
  onErrorRef.current = onError;

  // 正在流式输出中的"进行中消息"标记（存于 store 的 isStreaming）
  // report 分片缓冲：complete 事件到达时统一解析
  const reportBuffer = useRef('');
  const reporting = useRef(false);
  // 最近一次完成的流类型：question=第 1 题，message=AI 提出的下一题
  const lastStreamType = useRef<'question' | 'message' | null>(null);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    reportBuffer.current = '';
    reporting.current = false;
    lastStreamType.current = null;

    const client = new SseClient({
      sessionId,
      onEvent: (event) => {
        const store = useInterviewStore.getState();

        switch (event.type) {
          case 'question':
          case 'message': {
            if (reporting.current) break; // 报告阶段忽略 question/message
            lastStreamType.current = event.type;
            const state = useInterviewStore.getState();
            const current = state.sessions[mode];
            const last = current.messages[current.messages.length - 1];
            const isAppending = last?.role === 'interviewer' && current.isStreaming;
            state.setStreaming(mode, true);
            if (isAppending) {
              state.appendToLastMessage(mode, event.data);
            } else {
              state.addMessage(mode, 'interviewer', event.data);
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
              // 实际出题轮数：AI 已提出的题数（currentRound），至少 1 轮
              const actualRounds = Math.max(store.sessions[mode].currentRound, 1);
              const report = normalizeReport(payload, sessionId, mode, actualRounds);
              store.setReport(mode, report);
              // 同步到本地历史（后端暂无历史接口，localStorage 兜底）
              store.addToHistory(report);
              reportBuffer.current = '';
              reporting.current = false;
            } else {
              // 普通问题阶段结束：固化流式消息
              store.setStreaming(mode, false);
              // 轮次 = AI 出题数：AI 每提出一道题（question 或 message）计一轮
              if (lastStreamType.current) {
                store.incrementRound(mode);
                lastStreamType.current = null;
              }
            }
            break;
          }

          case 'error': {
            store.setStreaming(mode, false);
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
      lastStreamType.current = null;
      client.disconnect();
    };
  }, [enabled, sessionId, mode]);
}
