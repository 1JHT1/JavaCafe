/**
 * CoffeeBeanSpinner —— 咖啡豆加载动画
 */
import { cn } from '@/utils/cn';

export function CoffeeBeanSpinner({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn('relative animate-spin-slow', className)}
      style={{ width: size, height: size }}
      aria-label="加载中"
      role="status"
    >
      {/* 咖啡豆：椭圆 + 中缝 */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #8D6E63, #5D4037 70%)',
        }}
      />
      <div
        className="absolute left-1/2 top-[10%] h-[80%] w-[2px] -translate-x-1/2 rounded"
        style={{ background: 'linear-gradient(to bottom, #3E2723, #EFEBE9 60%, #3E2723)' }}
      />
    </div>
  );
}
