/**
 * DailyCheckIn —— 每日一杯（登录用户专属打卡）
 *
 * 协调说明：打卡历史按 userId 隔离存 localStorage，登录用户同步服务器
 * （/api/checkin/dates），任意浏览器/设备登录均可看到账号自己的记录；
 * 未登录不渲染（HomePage 已整体隐藏打卡足迹区块，此处防御性兜底）；
 * 每次打卡/外部同步广播 CHECKIN_UPDATED_EVENT，本组件与首页贡献图同步刷新。
 * 样式为独立小框，由 HomePage 放在打卡足迹区块标题右侧，不额外占用主体空间。
 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Coffee, CheckCircle2 } from 'lucide-react';
import {
  CHECKIN_UPDATED_EVENT,
  loadCheckInDates,
  notifyCheckInUpdated,
  persistCheckInDates,
  todayKey,
} from '@/utils/checkin';
import { useUserStore } from '@/stores/userStore';
import { Button } from '@/components/common/Button';

export function DailyCheckIn() {
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);
  const userId = useUserStore((s) => s.userId);
  const [checkInDates, setCheckInDates] = useState<string[]>(() => loadCheckInDates(userId));

  // 用户切换（登录/退出/换号）时重置为对应账号的打卡记录
  useEffect(() => {
    setCheckInDates(loadCheckInDates(userId));
  }, [userId]);

  // 监听打卡变更事件（本页打卡/登录同步/跨标签页）保持状态与本地缓存一致
  useEffect(() => {
    const handler = () => setCheckInDates(loadCheckInDates(userId));
    window.addEventListener(CHECKIN_UPDATED_EVENT, handler);
    return () => window.removeEventListener(CHECKIN_UPDATED_EVENT, handler);
  }, [userId]);

  // 未登录不渲染：打卡足迹为登录用户专属功能
  if (!isLoggedIn) return null;

  const checkedToday = checkInDates.includes(todayKey());

  const handleCheckIn = () => {
    const key = todayKey();
    const next = checkInDates.includes(key) ? checkInDates : [...checkInDates, key];
    persistCheckInDates(userId, next);
    notifyCheckInUpdated(next);
    setCheckInDates(next);
    toast.success('今日一杯已备好 ☕ 开始面试吧！');
  };

  return (
    <div className="flex shrink-0 items-center gap-2 rounded-xl bg-cream px-2.5 py-1.5 shadow-sm ring-1 ring-brown-200">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cream/60">
        {checkedToday ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        ) : (
          <Coffee className="h-3.5 w-3.5 text-accent-light" />
        )}
      </span>
      <span className="whitespace-nowrap text-xs font-medium text-brown-700">
        {checkedToday ? '今日已享用' : '每天一杯咖啡'}
      </span>
      <Button
        variant={checkedToday ? 'outline' : 'primary'}
        size="sm"
        disabled={checkedToday}
        onClick={handleCheckIn}
        className="h-7 shrink-0 rounded-lg px-2.5 text-xs"
      >
        {checkedToday ? '已享用' : '打卡'}
      </Button>
    </div>
  );
}
