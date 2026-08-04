/**
 * Modal —— 通用弹窗（规范文档 9.2）
 */
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  /** 点击遮罩是否关闭，默认 true */
  maskClosable?: boolean;
  className?: string;
}

export function Modal({ open, title, onClose, children, maskClosable = true, className }: ModalProps) {
  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brown-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (maskClosable && e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          'w-full max-w-md animate-slide-up rounded-3xl bg-cream p-6 shadow-2xl',
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-brown-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="rounded-full p-1.5 text-brown-500 transition-colors hover:bg-brown-100 hover:text-brown-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
