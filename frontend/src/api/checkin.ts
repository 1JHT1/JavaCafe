/**
 * 打卡记录接口 —— /api/checkin/dates
 * 打卡历史云端同步：登录用户打卡后同步到服务器，任意浏览器/设备登录均可拉取；
 * 匿名用户仍走本地 localStorage（后端对 anonymous 返回空列表 / 拒绝写入）。
 */
import { http } from './client';

export const checkInApi = {
  /** 拉取当前用户全部打卡日期（yyyy-MM-dd，升序） */
  getDates: () => http.get<string[]>('/api/checkin/dates'),

  /** 批量同步打卡日期（按 userId+date 去重幂等），返回合并后的全部日期 */
  saveDates: (dates: string[]) => http.post<string[]>('/api/checkin/dates', dates),
};
