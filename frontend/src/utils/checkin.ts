/**
 * 每日一杯打卡 —— 本地历史记录 + 登录用户云端同步
 *
 * 数据存储：
 * 1. localStorage 的 yyyy-MM-dd 数组（升序），key 按 userId 隔离（checkInDatesKey）；
 * 2. 登录用户打卡同步服务器（/api/checkin/dates，按 userId+date 去重幂等），登录后拉取合并，
 *    任意浏览器/设备登录均可看到账号自己的打卡记录；
 * 3. 匿名用户仍走本地（服务器对 anonymous 返回空/拒绝写入），旧版本全局数据一次性迁移给匿名用户。
 */
import { checkInDatesKey, STORAGE_KEYS } from './constants';
import { checkInApi } from '@/api/checkin';

/** 打卡数据变更广播事件（打卡组件写后广播，贡献图监听刷新） */
export const CHECKIN_UPDATED_EVENT = 'javacafe:checkin-updated';

/** 当前日期 → yyyy-MM-dd */
export function todayKey(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 解析日期数组（过滤非法项） */
function parseDateList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x))
      : [];
  } catch {
    return [];
  }
}

/** 旧版本未隔离的全局打卡数据（数组 key + 单值 key），供匿名用户一次性迁移 */
function readLegacyDates(): string[] {
  const list = parseDateList(localStorage.getItem(STORAGE_KEYS.checkInDates));
  const legacy = localStorage.getItem(STORAGE_KEYS.checkInDate);
  if (legacy && /^\d{4}-\d{2}-\d{2}$/.test(legacy)) list.push(legacy);
  return list;
}

/** 读取打卡历史（按 userId 隔离；匿名用户合并旧版本全局数据迁移，保证升序去重） */
export function loadCheckInDates(userId: string): string[] {
  const uid = userId || 'anonymous';
  try {
    const list = parseDateList(localStorage.getItem(checkInDatesKey(uid)));
    // 仅匿名用户承接旧版本全局数据；登录用户从自己的记录开始
    if (uid === 'anonymous') list.push(...readLegacyDates());
    return [...new Set(list)].sort();
  } catch {
    return [];
  }
}

/** 写本地缓存；匿名用户顺带清理旧全局 key（迁移完成使命后清除） */
function writeLocal(uid: string, dates: string[]): void {
  localStorage.setItem(checkInDatesKey(uid), JSON.stringify(dates));
  if (uid === 'anonymous') {
    localStorage.removeItem(STORAGE_KEYS.checkInDates);
    localStorage.removeItem(STORAGE_KEYS.checkInDate);
  }
}

/** 持久化打卡历史（按 userId 隔离；登录用户异步同步服务器，localStorage 不可用时不阻断交互） */
export function persistCheckInDates(userId: string, dates: string[]): void {
  const uid = userId || 'anonymous';
  try {
    writeLocal(uid, dates);
    if (uid !== 'anonymous') {
      // 登录用户：异步同步到服务器（失败静默，下次打卡自动重试；后端按 userId+date 去重幂等）
      checkInApi.saveDates(dates).catch(() => {});
    }
  } catch {
    // localStorage 不可用时不阻断交互
  }
}

/**
 * 登录后从服务器拉取打卡记录并合并本地（并集，写回本地缓存），返回合并结果。
 * 并集而非覆盖：本地可能留有服务器同步失败时的记录，合并保底不丢；
 * 匿名用户跳过网络请求，直接返回本地记录。失败静默保留本地，下次打卡/登录重试。
 */
export async function syncCheckInDatesFromServer(userId: string): Promise<string[]> {
  const uid = userId || 'anonymous';
  const local = loadCheckInDates(uid);
  if (uid === 'anonymous') return local;
  try {
    const remote = await checkInApi.getDates();
    const merged = [...new Set([...remote, ...local])].sort();
    writeLocal(uid, merged);
    return merged;
  } catch {
    return local;
  }
}

/** 广播打卡数据变更（供贡献图等组件刷新） */
export function notifyCheckInUpdated(dates: string[]): void {
  window.dispatchEvent(new CustomEvent(CHECKIN_UPDATED_EVENT, { detail: dates }));
}
