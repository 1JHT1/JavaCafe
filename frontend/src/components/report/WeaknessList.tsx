/**
 * WeaknessList —— 薄弱点列表（CupNoteReport.weaknesses，含改进建议）
 */
import { AlertTriangle, Lightbulb } from 'lucide-react';
import type { WeaknessPoint } from '@/types/report';

interface WeaknessListProps {
  weaknesses: WeaknessPoint[];
}

export function WeaknessList({ weaknesses }: WeaknessListProps) {
  if (!weaknesses || weaknesses.length === 0) {
    return (
      <p className="text-sm text-brown-500">暂无薄弱点记录</p>
    );
  }

  return (
    <ul className="space-y-3">
      {weaknesses.map((item, index) => (
        <li key={`${item.topic}-${index}`} className="rounded-2xl bg-white p-4 ring-1 ring-brown-100">
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brown-900">{item.topic}</p>
              {item.comment && <p className="mt-1 text-sm leading-relaxed text-brown-700/80">{item.comment}</p>}
            </div>
          </div>
          {item.suggestion && (
            <div className="mt-3 flex gap-2 rounded-xl bg-accent-light/10 px-3 py-2">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-dark" />
              <p className="text-xs leading-relaxed text-accent-dark">{item.suggestion}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
