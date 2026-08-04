/**
 * ChatBubble —— 对话气泡（规范文档 9.8）
 */
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';
import type { ChatMessage } from '@/api/types';

interface ChatBubbleProps {
  message: ChatMessage;
  /** 最后一条面试官消息正在流式输出 */
  streaming?: boolean;
}

export function ChatBubble({ message, streaming = false }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex animate-fade-in items-start gap-3', isUser && 'flex-row-reverse')}>
      {/* 头像 */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg shadow-sm',
          isUser ? 'bg-brown-700' : 'bg-cream ring-1 ring-brown-200',
        )}
        aria-hidden
      >
        {isUser ? '👤' : '☕'}
      </div>

      {/* 气泡 */}
      <div className={cn('flex max-w-[78%] flex-col', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
            isUser
              ? 'rounded-tr-sm bg-brown-700 text-cream'
              : 'rounded-tl-sm bg-white text-brown-900 ring-1 ring-brown-100',
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
          {streaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse-soft bg-accent align-middle" />}
        </div>
        <span className="mt-1 px-1 text-[10px] text-brown-400">
          {isUser ? '我' : 'JavaCafe 咖啡师'} · {formatDateTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
