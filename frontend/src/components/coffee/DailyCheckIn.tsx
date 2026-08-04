/**
 * DailyCheckIn —— 每日签到（本地记录 + 次日 0 点倒计时）
 *
 * 协调说明：签到为纯前端功能（localStorage），后端无对应接口；
 * 后续如需积分系统，可在此处接入 POST /api/checkin。
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Coffee, CheckCircle2 } from 'lucide-react';
import { STORAGE_KEYS } from '@/utils/constants';
import { useCountdown } from '@/hooks/useCountdown';
import { Button } from '@/components/common/Button';

function todayKey(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 下一个 0 点（用于倒计时） */
function nextMidnight(): Date {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d;
}

export function DailyCheckIn() {
  const [checkedDate, setCheckedDate] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.checkInDate) ?? '';
    } catch {
      return '';
    }
  });

  const checkedToday = checkedDate === todayKey();

  const target = useMemo(() => (checkedToday ? nextMidnight() : null), [checkedToday]);
  const { text } = useCountdown(target);

  const handleCheckIn = () => {
    const key = todayKey();
    try {
      localStorage.setItem(STORAGE_KEYS.checkInDate, key);
    } catch {
      // localStorage 不可用时仍允许本次签到
    }
    setCheckedDate(key);
    toast.success('签到成功 ☕ 今日咖啡已备好，开始面试吧！');
  };

  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl bg-brown-700 p-6 text-center text-cream shadow-lg shadow-brown-900/20 sm:flex-row sm:justify-between sm:text-left">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 animate-float items-center justify-center rounded-2xl bg-cream/10">
          {checkedToday ? <CheckCircle2 className="h-6 w-6 text-success" /> : <Coffee className="h-6 w-6 text-accent-light" />}
        </span>
        <div>
          <p className="font-display text-lg font-bold">每日签到</p>
          <p className="text-sm text-cream/70">
            {checkedToday ? `今日已签到，明天 ${text} 后解锁新咖啡` : '签到后获得今日面试能量'}
          </p>
        </div>
      </div>
      <Button
        variant={checkedToday ? 'outline' : 'primary'}
        size="md"
        disabled={checkedToday}
        onClick={handleCheckIn}
        className={checkedToday ? 'border-cream/30 text-cream hover:bg-cream/10' : ''}
      >
        {checkedToday ? '已签到' : '立即签到'}
      </Button>
    </div>
  );
}
