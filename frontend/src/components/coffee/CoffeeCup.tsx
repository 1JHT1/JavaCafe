/**
 * CoffeeCup —— SVG 咖啡杯装饰图
 * 可复用于首页 Hero、报告页空态等
 */
interface CoffeeCupProps {
  className?: string;
}

export function CoffeeCup({ className = 'h-16 w-16' }: CoffeeCupProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      {/* 杯身 */}
      <path
        d="M14 24h28v20a10 10 0 0 1-10 10h-8a10 10 0 0 1-10-10V24Z"
        fill="#EFEBE9"
        stroke="#8D6E63"
        strokeWidth="2.5"
      />
      {/* 咖啡液面 */}
      <path d="M16.5 27h23v5a8 8 0 0 1-8 8h-7a8 8 0 0 1-8-8v-5Z" fill="#5D4037" opacity="0.85" />
      {/* 杯柄 */}
      <path
        d="M42 30h3a5 5 0 0 1 0 10h-5"
        stroke="#8D6E63"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* 托盘 */}
      <ellipse cx="32" cy="56" rx="20" ry="3" fill="#BCAAA4" />
      {/* 蒸汽 */}
      <path
        d="M26 16c-1.5-2 1.5-3 0-5M32 16c-1.5-2 1.5-3 0-5M38 16c-1.5-2 1.5-3 0-5"
        stroke="#BCAAA4"
        strokeWidth="2"
        strokeLinecap="round"
        className="animate-steam"
      />
    </svg>
  );
}
