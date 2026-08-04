/**
 * LatteHeart —— 拿铁拉花心形（页面点缀动画）
 */
import { cn } from '@/utils/cn';

interface LatteHeartProps {
  className?: string;
}

export function LatteHeart({ className }: LatteHeartProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn('h-8 w-8', className)} aria-hidden>
      <path
        d="M12 20.5C7 16.5 3 13 3 9.2 3 6.5 5 4.5 7.5 4.5c1.8 0 3.4 1 4.5 2.6C13.1 5.5 14.7 4.5 16.5 4.5 19 4.5 21 6.5 21 9.2c0 3.8-4 7.3-9 11.3z"
        fill="#FF7043"
        opacity="0.85"
      />
    </svg>
  );
}
