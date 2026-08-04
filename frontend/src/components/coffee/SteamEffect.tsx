/**
 * SteamEffect —— 咖啡蒸汽动画（装饰用，animate-steam）
 */
interface SteamEffectProps {
  /** 蒸汽股数，默认 3 */
  count?: number;
  /** 动画延迟差异，默认 true */
  stagger?: boolean;
}

export function SteamEffect({ count = 3, stagger = true }: SteamEffectProps) {
  return (
    <div className="pointer-events-none flex items-end justify-center gap-2" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className="h-8 w-1.5 animate-steam rounded-full bg-brown-300/60 blur-[1px]"
          style={stagger ? { animationDelay: `${index * 0.4}s` } : undefined}
        />
      ))}
    </div>
  );
}
