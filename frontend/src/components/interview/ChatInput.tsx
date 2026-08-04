/**
 * ChatInput —— 回答输入框（规范文档 9.9）
 */
import { useRef, useState, type KeyboardEvent } from 'react';
import { Send, Coffee } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ChatInputProps {
  disabled?: boolean;
  placeholder?: string;
  onSubmit: (text: string) => void;
}

export function ChatInput({ disabled = false, placeholder = '输入你的回答，Ctrl+Enter 发送…', onSubmit }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSubmit(text);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter 发送；Enter 换行
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div
      className={cn(
        'flex items-end gap-2 rounded-2xl border bg-white p-2 shadow-sm transition-colors',
        disabled ? 'border-brown-100 opacity-60' : 'border-brown-200 focus-within:border-accent',
      )}
    >
      <textarea
        ref={textareaRef}
        value={value}
        rows={1}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          autoResize();
        }}
        onKeyDown={handleKeyDown}
        className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-brown-900 placeholder:text-brown-400 focus:outline-none disabled:cursor-not-allowed"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="发送"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        {disabled ? <Coffee className="h-4 w-4 animate-pulse-soft" /> : <Send className="h-4 w-4" />}
      </button>
    </div>
  );
}
