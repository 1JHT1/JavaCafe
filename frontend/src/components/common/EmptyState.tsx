/**
 * EmptyState —— 空状态占位（规范文档 9.4）
 */
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && <div className="text-5xl">{icon}</div>}
      <h3 className="font-display text-lg font-semibold text-brown-900">{title}</h3>
      {description && <p className="max-w-sm text-sm text-brown-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
