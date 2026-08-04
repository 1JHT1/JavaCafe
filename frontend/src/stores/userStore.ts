/**
 * 用户状态（规范文档 7.2）—— 本地持久化
 *
 * 协调说明：后端暂无用户画像读写接口（仅有 UserProfileDto），
 * 先落 localStorage；等后端提供 GET/PUT /api/user/profile 后在此切换。
 */
import { create } from 'zustand';
import type { UserProfile } from '@/api/types';
import { STORAGE_KEYS } from '@/utils/constants';

const DEFAULT_PROFILE: UserProfile = {
  userId: 'anonymous',
  displayName: '咖啡学员',
  targetPosition: '',
  experienceLevel: '',
  strengths: '',
  weaknesses: '',
};

function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.userProfile);
    return raw ? { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<UserProfile>) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

interface UserState extends UserProfile {
  setProfile: (profile: Partial<UserProfile>) => void;
  resetProfile: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  ...loadProfile(),

  setProfile: (profile) => {
    const next = { ...get(), ...profile };
    set(next);
    localStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(next));
  },

  resetProfile: () => {
    set(DEFAULT_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.userProfile);
  },
}));
