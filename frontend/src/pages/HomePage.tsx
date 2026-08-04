/**
 * HomePage —— 首页（规范文档 8.1）
 * Hero 区 + 每日签到 + 咖啡菜单宫格
 */
import { SteamEffect } from '@/components/coffee/SteamEffect';
import { CoffeeCup } from '@/components/coffee/CoffeeCup';
import { DailyCheckIn } from '@/components/coffee/DailyCheckIn';
import { CoffeeMenuGrid } from '@/components/menu/CoffeeMenuGrid';

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="relative flex flex-col items-center gap-6 overflow-hidden rounded-3xl bg-brown-900 px-6 py-14 text-center text-cream shadow-xl shadow-brown-900/30">
        <SteamEffect count={3} />
        <CoffeeCup className="h-24 w-24 animate-float" />
        <div>
          <h1 className="font-display text-4xl font-bold tracking-wide sm:text-5xl">
            JavaCafe <span className="text-accent-light">☕</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream/70 sm:text-base">
            每一杯咖啡，都是一场面试。选择你的口味，开启一场由 AI 咖啡师主持的 Java 技术面试。
          </p>
        </div>
        <div className="flex gap-2 text-xs text-cream/60">
          <span className="rounded-full bg-cream/10 px-3 py-1">项目深挖 · 手冲</span>
          <span className="rounded-full bg-cream/10 px-3 py-1">系统设计 · 美式</span>
          <span className="rounded-full bg-cream/10 px-3 py-1">八股问答 · 拿铁</span>
          <span className="rounded-full bg-cream/10 px-3 py-1">综合模拟 · 特调</span>
        </div>
      </section>

      {/* 每日签到 */}
      <DailyCheckIn />

      {/* 咖啡菜单 */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-brown-900">今日咖啡菜单</h2>
            <p className="mt-1 text-sm text-brown-500">选择一杯咖啡，开始你的面试之旅</p>
          </div>
        </div>
        <CoffeeMenuGrid />
      </section>
    </div>
  );
}
