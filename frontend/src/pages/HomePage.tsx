/**
 * HomePage —— 首页（规范文档 8.1）
 * Hero 区 + 每日一杯 + 打卡足迹贡献图 + 咖啡菜单宫格
 */
import { useEffect, useState } from 'react';
import { SteamEffect } from '@/components/coffee/SteamEffect';
import { CoffeeCup } from '@/components/coffee/CoffeeCup';
import { DailyCheckIn } from '@/components/coffee/DailyCheckIn';
import { ContributionCalendar } from '@/components/coffee/ContributionCalendar';
import { CoffeeMenuGrid } from '@/components/menu/CoffeeMenuGrid';
import { CHECKIN_UPDATED_EVENT, loadCheckInDates } from '@/utils/checkin';
import { useUserStore } from '@/stores/userStore';

export default function HomePage() {
  // 打卡足迹仅登录用户可见：未登录不渲染区块，登录后按 userId 读取各自记录
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);
  const userId = useUserStore((s) => s.userId);
  // 打卡历史：按 userId 读取 localStorage，并监听打卡事件实时刷新
  const [checkInDates, setCheckInDates] = useState<string[]>(() => loadCheckInDates(userId));
  useEffect(() => {
    // 用户切换（登录/退出/换号）时重置为对应账号的打卡记录
    setCheckInDates(loadCheckInDates(userId));
  }, [userId]);
  useEffect(() => {
    const handler = () => setCheckInDates(loadCheckInDates(userId));
    window.addEventListener(CHECKIN_UPDATED_EVENT, handler);
    return () => window.removeEventListener(CHECKIN_UPDATED_EVENT, handler);
  }, [userId]);

  return (
    <div className="flex flex-col gap-10">
      {/* Hero 区 */}
      <section className="relative flex flex-col items-center gap-6 overflow-hidden rounded-3xl bg-brown-900 px-6 py-14 text-center text-cream shadow-xl shadow-brown-900/30">
        <SteamEffect count={3} />
        <CoffeeCup className="h-24 w-24 animate-float" />
        <div>
          <h1 className="font-display text-4xl font-bold tracking-wide sm:text-5xl">
            JavaCafe <span className="text-accent-light">☕</span>
          </h1>
          <p className="mt-3 max-w-full whitespace-nowrap text-sm text-cream/70">
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

      {/* 打卡足迹（每日一杯小框 + LeetCode 风格贡献图）—— 仅登录用户可见 */}
      {isLoggedIn && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-brown-900">打卡足迹</h2>
              <p className="mt-1 text-sm text-brown-500">每一天的坚持，都值得被记住</p>
            </div>
            <DailyCheckIn />
          </div>
          <ContributionCalendar dates={checkInDates} />
        </section>
      )}

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
