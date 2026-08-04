/**
 * LoadingScreen —— 全屏加载（开始面试/生成报告等待）
 */
import { CoffeeBeanSpinner } from '@/components/interview/CoffeeBeanSpinner';

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
}

export function LoadingScreen({ title = '正在研磨咖啡豆…', subtitle }: LoadingScreenProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <CoffeeBeanSpinner />
      <p className="font-display text-lg font-semibold text-brown-900">{title}</p>
      {subtitle && <p className="text-sm text-brown-500">{subtitle}</p>}
    </div>
  );
}
