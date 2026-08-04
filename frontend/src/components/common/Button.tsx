/**
 * Button —— 通用按钮（规范文档 9.1）
 */
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** 加载中：禁用并显示转圈 */
  loading?: boolean;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-dark focus-visible:ring-accent-light shadow-sm shadow-accent/30',
  secondary: 'bg-brown-700 text-cream hover:bg-brown-900 focus-visible:ring-brown-500',
  outline:
    'border border-brown-300 bg-transparent text-brown-700 hover:bg-brown-100 focus-visible:ring-brown-300',
  ghost: 'bg-transparent text-brown-700 hover:bg-brown-100 focus-visible:ring-brown-300',
  danger: 'bg-error text-white hover:bg-error/90 focus-visible:ring-error/50',
};

const SIZE_CLASS: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-2xl gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className,
      )}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      )}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
