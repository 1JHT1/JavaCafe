/**
 * useSSE —— 面试 SSE 流式会话 Hook（规范文档 7.4）
 *
 * 连接生命周期由全局 sseManager 管理：本 Hook 仅负责订阅/退订。
 * 页面切换（组件卸载）只退订、不断开连接 —— 会话事件由 sseManager
 * 持续写入 store，切回页面时消息完整、无需重连。
 * 连接只在会话真正结束时关闭：报告完成 / 用户取消 / 重连耗尽。
 */
import { useEffect, useRef } from 'react';
import { subscribeSse } from '@/api/sseManager';
import type { SseStatus } from '@/api/sseManager';
import { useInterviewStore } from '@/stores/interviewStore';
import type { InterviewMode } from '@/types/interview';

export type { SseStatus } from '@/api/sseManager';

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

  // 保存回调的最新引用，避免重复订阅
  const onStatusChangeRef = useRef(onStatusChange);
  const onErrorRef = useRef(onError);
  onStatusChangeRef.current = onStatusChange;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!enabled || !sessionId) return;
    // 订阅会话事件流（连接由 sseManager 保持，页面切换不断开）
    return subscribeSse(sessionId, mode, {
      onStatusChange: (status) => onStatusChangeRef.current?.(status),
      onError: (message) => onErrorRef.current?.(message),
    });
  }, [enabled, sessionId, mode]);
}
