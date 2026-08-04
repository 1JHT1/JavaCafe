/**
 * InterviewToolbar —— 面试页工具栏（轮数进度 / 连接状态 / 结束面试）
 */
import { Wifi, WifiOff, RefreshCw, Flag } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { SseStatus } from '@/hooks/useSSE';

interface InterviewToolbarProps {
  currentRound: number;
  maxRounds: number;
  sseStatus: SseStatus;
  onEnd: () => void;
}

const STATUS_META: Record<SseStatus, { label: string; dot: string }> = {
  idle: { label: '未连接', dot: 'bg-brown-300' },
  connecting: { label: '连接中', dot: 'bg-warning' },
  open: { label: '已连接', dot: 'bg-success' },
  reconnecting: { label: '重连中', dot: 'bg-warning' },
  closed: { label: '已断开', dot: 'bg-brown-300' },
  error: { label: '连接异常', dot: 'bg-error' },
};

export function InterviewToolbar({ currentRound, maxRounds, sseStatus, onEnd }: InterviewToolbarProps) {
  const meta = STATUS_META[sseStatus];
  const percent = Math.min(100, Math.round((currentRound / maxRounds) * 100));

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-brown-100">
      {/* 轮数进度 */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="shrink-0 text-xs font-medium text-brown-500">
          第 <span className="font-display text-base font-bold text-accent">{currentRound}</span> / {maxRounds} 轮
        </span>
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-brown-100">
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* 连接状态 */}
      <span className="hidden shrink-0 items-center gap-1.5 text-xs text-brown-500 sm:flex" title={`SSE 状态：${meta.label}`}>
        {sseStatus === 'open' ? <Wifi className="h-3.5 w-3.5 text-success" /> : <WifiOff className="h-3.5 w-3.5 text-brown-400" />}
        <span className={cn('inline-block h-1.5 w-1.5 rounded-full', meta.dot)} />
        {meta.label}
      </span>

      {/* 结束面试 */}
      <button
        type="button"
        onClick={onEnd}
        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-brown-200 px-3 py-1.5 text-xs font-medium text-brown-700 transition-colors hover:border-error hover:text-error"
      >
        {currentRound >= maxRounds ? <RefreshCw className="h-3.5 w-3.5" /> : <Flag className="h-3.5 w-3.5" />}
        结束面试
      </button>
    </div>
  );
}
