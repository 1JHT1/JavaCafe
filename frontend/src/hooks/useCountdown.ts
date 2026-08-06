/**
 * useCountdown —— 倒计时 Hook
 * 用于每日一杯冷却、报告生成等待等场景
 */
import { useEffect, useMemo, useState } from 'react';

export interface UseCountdownResult {
  /** 剩余秒数 */
  remaining: number;
  /** 是否已结束 */
  finished: boolean;
  /** 已格式化文本（mm:ss） */
  text: string;
}

/**
 * @param target 目标时间（Date/时间戳/ISO 字符串）；传入 null/undefined 则不启动
 * @param onEnd  倒计时结束回调
 */
export function useCountdown(target: Date | number | string | null | undefined, onEnd?: () => void): UseCountdownResult {
  const endTime = useMemo(() => {
    if (target == null) return 0;
    const t = target instanceof Date ? target.getTime() : new Date(target).getTime();
    return Number.isNaN(t) ? 0 : t;
  }, [target]);

  const [remaining, setRemaining] = useState(() => (endTime ? Math.max(0, Math.ceil((endTime - Date.now()) / 1000)) : 0));

  useEffect(() => {
    if (!endTime) {
      setRemaining(0);
      return;
    }

    const tick = () => {
      const seconds = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds <= 0) onEnd?.();
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endTime]);

  const finished = remaining <= 0 && !!endTime;

  return {
    remaining,
    finished,
    text: `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`,
  };
}
