/**
 * TypingIndicator —— "咖啡师正在思考" 三点动画（可自定义文案）
 */
export function TypingIndicator({ label = '咖啡师正在输入' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 px-1 py-2" aria-label={label}>
      <span className="text-xs text-brown-500">{label}</span>
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-brown-300"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </div>
  );
}
