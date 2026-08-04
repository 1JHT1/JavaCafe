/**
 * SuggestionCard —— 进阶建议卡片（CupNoteReport.suggestions）
 */
import { BookOpen } from 'lucide-react';

interface SuggestionCardProps {
  suggestions: string[];
}

export function SuggestionCard({ suggestions }: SuggestionCardProps) {
  if (!suggestions || suggestions.length === 0) {
    return (
      <p className="text-sm text-brown-500">暂无进阶建议</p>
    );
  }

  return (
    <ol className="space-y-2.5">
      {suggestions.map((suggestion, index) => (
        <li key={`${suggestion.slice(0, 16)}-${index}`} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brown-700 font-display text-xs font-bold text-cream">
            {index + 1}
          </span>
          <p className="text-sm leading-relaxed text-brown-700/90">{suggestion}</p>
        </li>
      ))}
    </ol>
  );
}

/** 建议区的卡片容器（供报告页使用） */
export function SuggestionSection({ suggestions }: SuggestionCardProps) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brown-100">
      <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-brown-900">
        <BookOpen className="h-5 w-5 text-accent" />
        进阶建议
      </h3>
      <SuggestionCard suggestions={suggestions} />
    </section>
  );
}
