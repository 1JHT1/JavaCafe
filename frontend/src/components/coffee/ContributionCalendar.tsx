/**
 * ContributionCalendar —— 打卡足迹贡献图（LeetCode 每日打卡风格，咖啡豆格子）
 *
 * 布局（两栏）：
 * - 左栏：打卡记录网格（按自然月分组显示当年 1~12 月，每月格子数 = 当月天数 28/29/30/31，
 *   1 号按真实星期几落位、前后透明占位，咖啡豆格子随列宽拉伸）
 * - 右栏：统计面板（连续/累计/本月/近 7 天）+ 图例，占满剩余空间
 * 有打卡记录为咖啡豆棕（深浅分级，烘焙色由浅到深），无记录为淡棕；月份组顶显示月份名，左侧显示星期标签。
 * 每日一杯打卡入口由 HomePage 以独立小框形式放在区块标题右侧。
 */
import { useMemo } from 'react';
import { cn } from '@/utils/cn';

/**
 * 咖啡豆格子：上下收尖的豆形（非正圆）+ 微倾中缝
 * small 用于图例中的小尺寸豆子
 */
function CoffeeBean({
  title,
  className,
  small = false,
}: {
  title?: string;
  className?: string;
  small?: boolean;
}) {
  return (
    <span
      title={title}
      style={{ borderRadius: '50% / 65% 65% 35% 35%' }}
      className={cn(
        'relative inline-block flex-1 rounded-full transition-colors',
        small ? 'min-h-2 w-2' : 'min-h-3 w-full min-w-3',
        className,
      )}
    >
      <span
        style={{ left: '50%', top: '22%', height: '56%', width: '1px', transform: 'translateX(-50%) rotate(-6deg)' }}
        className="absolute rounded-full bg-brown-900/50"
      />
    </span>
  );
}

/** 格子颜色分级：0=未打卡，1/2/3=当天打卡次数（每日打卡至多 1 次，分级为未来扩展预留） */
function cellClass(count: number): string {
  if (count === 0) return 'bg-brown-100 hover:bg-brown-300/70';
  if (count === 1) return 'bg-brown-300 hover:bg-brown-500';
  if (count === 2) return 'bg-brown-500 hover:bg-brown-700';
  return 'bg-brown-900 hover:bg-brown-900';
}

function toKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toChinese(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return `${y} 年 ${m} 月 ${d} 日`;
}

/** 当前连续打卡天数（今天未打卡时从昨天起算） */
function calcStreak(dates: string[]): number {
  const set = new Set(dates);
  let streak = 0;
  const d = new Date();
  if (!set.has(toKey(d))) d.setDate(d.getDate() - 1);
  while (set.has(toKey(d))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** 统计小卡片（紧凑尺寸） */
function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-brown-100/60 p-2">
      <p className="text-[11px] text-brown-500">{label}</p>
      <p className={cn('mt-0.5 font-display text-base font-bold', accent ? 'text-accent' : 'text-brown-900')}>
        {value}
      </p>
    </div>
  );
}

export function ContributionCalendar({ dates }: { dates: string[] }) {
  const { countMap, todayK } = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of dates) m.set(d, (m.get(d) ?? 0) + 1);
    return { countMap: m, todayK: toKey(new Date()) };
  }, [dates]);

  // 当年 12 个自然月：每月格子数 = 当月天数（2 月 28/29、4 月 30、其余 31），
  // 每列 7 格位对应周日~周六，1 号按真实星期几落位，前后透明占位补满
  const months = useMemo(() => {
    const year = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const daysInMonth = new Date(year, month, 0).getDate();
      const firstWeekday = new Date(year, month - 1, 1).getDay();
      const weeks: ({ date: Date; key: string; count: number } | null)[][] = [];
      for (let c = 0; c < Math.ceil((daysInMonth + firstWeekday) / 7); c += 1) {
        const col: ({ date: Date; key: string; count: number } | null)[] = [];
        for (let r = 0; r < 7; r += 1) {
          const dayNum = c * 7 + r - firstWeekday + 1;
          if (dayNum >= 1 && dayNum <= daysInMonth) {
            const date = new Date(year, month - 1, dayNum);
            const key = toKey(date);
            col.push({ date, key, count: countMap.get(key) ?? 0 });
          } else {
            col.push(null);
          }
        }
        weeks.push(col);
      }
      return { month, label: `${month} 月`, weeks };
    });
  }, [countMap]);

  const streak = useMemo(() => calcStreak(dates), [dates]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthCount = dates.filter((d) => d.startsWith(monthPrefix)).length;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    const weekCount = dates.filter((d) => d >= toKey(weekStart)).length;
    return { monthCount, weekCount };
  }, [dates]);

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-brown-100">
      <div className="flex flex-col gap-5 lg:flex-row">
        {/* 左栏：打卡记录网格（占 3/4，按自然月分组，每月格子数 = 当月天数） */}
        <div className="flex min-w-0 flex-[3] flex-col overflow-x-auto">
          <div className="flex flex-1 gap-2">
            {/* 星期标签 */}
            <div className="flex flex-col gap-1 text-[10px] leading-none text-brown-500">
              <span className="flex-1" />
              <span className="flex flex-1 items-center">一</span>
              <span className="flex-1" />
              <span className="flex flex-1 items-center">三</span>
              <span className="flex-1" />
              <span className="flex flex-1 items-center">五</span>
              <span className="flex-1" />
            </div>
            {/* 月份分组（12 组均分撑满，组间 gap-2 区分月份） */}
            <div className="flex flex-1 items-start gap-2">
              {months.map((m) => (
                <div key={m.month} className="flex min-w-3 flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] leading-none text-brown-500">{m.label}</span>
                  <div className="flex w-full gap-1">
                    {m.weeks.map((col, c) => (
                      <div key={c} className="flex min-w-3 flex-1 flex-col gap-1">
                        {col.map((cell, r) =>
                          cell ? (
                            <CoffeeBean
                              key={cell.key}
                              title={`${toChinese(cell.key)} · ${cell.count > 0 ? `打卡 ${cell.count} 次` : '未打卡'}`}
                              className={cn(
                                cellClass(cell.count),
                                cell.key === todayK && 'ring-2 ring-accent ring-offset-1 ring-offset-white',
                              )}
                            />
                          ) : (
                            <span key={`${c}-${r}`} className="min-h-3 w-full" />
                          ),
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右栏：统计面板（除记录外的所有内容，占满剩余空间） */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="连续打卡" value={`${streak} 天`} accent={streak > 0} />
            <StatCard label="累计打卡" value={`${dates.length} 天`} />
            <StatCard label="本月打卡" value={`${stats.monthCount} 天`} />
            <StatCard label="近 7 天" value={`${stats.weekCount} 天`} />
          </div>

          {/* 图例 */}
          <div className="flex items-center gap-1.5 text-xs text-brown-500">
            少
            <CoffeeBean small className="bg-brown-100" />
            <CoffeeBean small className="bg-brown-300" />
            <CoffeeBean small className="bg-brown-500" />
            <CoffeeBean small className="bg-brown-900" />
            多
          </div>
        </div>
      </div>
    </div>
  );
}
