/**
 * ScoreCircle —— 环形评分（SVG，按分数着色）
 * 分数 0-100：>=85 金棕 / >=70 暖橙 / 其余 灰棕
 */
import { cn } from '@/utils/cn';

interface ScoreCircleProps {
  /** 0-100 */
  score: number;
  /** 环形直径，默认 120 */
  size?: number;
}

function scoreColor(score: number): string {
  if (score >= 85) return '#8D6E63'; // brown-500
  if (score >= 70) return '#FF7043'; // accent
  return '#BCAAA4'; // brown-300
}

export function ScoreCircle({ score, size = 120 }: ScoreCircleProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color = scoreColor(clamped);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* 底环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={10}
          className="text-brown-100"
        />
        {/* 进度环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-display text-4xl font-bold')} style={{ color }}>
          {Math.round(clamped)}
        </span>
        <span className="text-xs text-brown-500">分</span>
      </div>
    </div>
  );
}
