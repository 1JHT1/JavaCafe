/**
 * StrengthList —— 优势点列表（CupNoteReport.strengths）
 */
import { Sparkles } from 'lucide-react';
import type { StrengthPoint } from '@/types/report';

interface StrengthListProps {
  strengths: StrengthPoint[];
}

export function StrengthList({ strengths }: StrengthListProps) {
  if (!strengths || strengths.length === 0) {
    return (
      <p className="text-sm text-brown-500">暂无优势点记录</p>
    );
  }

  return (
    <ul className="space-y-3">
      {strengths.map((item, index) => (
        <li key={`${item.topic}-${index}`} className="flex gap-3 rounded-2xl bg-white p-4 ring-1 ring-brown-100">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brown-900">{item.topic}</p>
            {item.comment && <p className="mt-1 text-sm leading-relaxed text-brown-700/80">{item.comment}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
