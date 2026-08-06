/**
 * InterviewToolbar —— 面试页工具栏（当前轮数 / 连接状态 / 取消面试 / 结束面试）
 *
 * 不设轮数上限：只展示已进行到的轮次，结束与否完全由用户决定
 * （结束 → 生成报告；取消 → 放弃会话回点单页重新开始）。
 */
import { Wifi, WifiOff, XCircle, Flag } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { SseStatus } from '@/hooks/useSSE';

interface InterviewToolbarProps {
  currentRound: number;
  sseStatus: SseStatus;
  onEnd: () => void;
  onCancel: () => void;
}

const STATUS_META: Record<SseStatus, { label: string; dot: string }> = {
  idle: { label: '未连接', dot: 'bg-brown-300' },
  connecting: { label: '连接中', dot: 'bg-warning' },
  open: { label: '已连接', dot: 'bg-success' },
  reconnecting: { label: '重连中', dot: 'bg-warning' },
  closed: { label: '已断开', dot: 'bg-brown-300' },
  error: { label: '连接异常', dot: 'bg-error' },
};

export function InterviewToolbar({ currentRound, sseStatus, onEnd, onCancel }: InterviewToolbarProps) {
  const meta = STATUS_META[sseStatus];

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-brown-100">
      {/* 当前轮数 */}
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="shrink-0 text-xs font-medium text-brown-500">
          第 <span className="font-display text-base font-bold text-accent">{currentRound}</span> 轮
        </span>
        <span className="hidden truncate text-xs text-brown-400 md:inline">不设轮数上限，聊尽兴为止</span>
      </div>

      {/* 连接状态 */}
      <span className="hidden shrink-0 items-center gap-1.5 text-xs text-brown-500 sm:flex" title={`SSE 状态：${meta.label}`}>
        {sseStatus === 'open' ? <Wifi className="h-3.5 w-3.5 text-success" /> : <WifiOff className="h-3.5 w-3.5 text-brown-400" />}
        <span className={cn('inline-block h-1.5 w-1.5 rounded-full', meta.dot)} />
        {meta.label}
      </span>

      {/* 操作按钮 */}
      <div className="flex shrink-0 items-center gap-2">
        {/* 取消面试：放弃会话、不生成报告，回点单页重新开始 */}
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-xl border border-brown-200 px-3 py-1.5 text-xs font-medium text-brown-500 transition-colors hover:border-error hover:text-error"
        >
          <XCircle className="h-3.5 w-3.5" />
          取消面试
        </button>
        {/* 结束面试：生成杯测报告 */}
        <button
          type="button"
          onClick={onEnd}
          className="flex items-center gap-1.5 rounded-xl border border-brown-200 px-3 py-1.5 text-xs font-medium text-brown-700 transition-colors hover:border-accent hover:text-accent"
        >
          <Flag className="h-3.5 w-3.5" />
          结束面试
        </button>
      </div>
    </div>
  );
}
