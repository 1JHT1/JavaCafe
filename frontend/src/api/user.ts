/**
 * 用户接口 —— /api/user/profile（P1-1）
 * 画像读写：登录后由 userStore 调 GET 拉取服务器画像，保存时乐观更新本地并 PUT 同步。
 */
import { http } from './client';
import type { UserProfile } from '@/types/user';

export const userApi = {
  /** 获取当前用户画像（匿名用户返回默认画像） */
  getProfile: () => http.get<UserProfile>('/api/user/profile'),

  /** 更新画像（匿名用户会得到 400：请先登录） */
  updateProfile: (profile: Partial<UserProfile>) => http.put<UserProfile>('/api/user/profile', profile),
};
