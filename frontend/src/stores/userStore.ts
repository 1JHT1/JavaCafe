/**
 * 用户状态（规范文档 7.2）—— 本地持久化 + 登录态 + 服务器画像同步（P1-1）
 *
 * 协调说明：
 * 1. 画像字段（displayName/targetPosition/...）本地兜底；登录后 getProfile 拉取服务器画像覆盖。
 * 2. setProfile 乐观更新本地，已登录时异步 PUT 同步后端（失败静默，下次保存重试）。
 * 3. 登录态（token/username）由 AuthPage 写入。
 */
import { create } from 'zustand';
import type { UserProfile } from '@/api/types';
import { userApi } from '@/api/user';
import { setToken } from '@/api/client';
import { useInterviewStore } from '@/stores/interviewStore';
import { STORAGE_KEYS } from '@/utils/constants';
import { notifyCheckInUpdated, syncCheckInDatesFromServer } from '@/utils/checkin';

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
    if (!raw) return DEFAULT_PROFILE;
    const stored = JSON.parse(raw) as Partial<UserProfile>;
    // 旧版本可能存过整棵 store（含 token 等非画像字段），只取画像字段
    return {
      ...DEFAULT_PROFILE,
      displayName: stored.displayName ?? DEFAULT_PROFILE.displayName,
      targetPosition: stored.targetPosition ?? '',
      experienceLevel: stored.experienceLevel ?? '',
      strengths: stored.strengths ?? '',
      weaknesses: stored.weaknesses ?? '',
      userId: stored.userId ?? 'anonymous',
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

/** 持久化画像字段到 localStorage（不写 token 等非画像字段） */
function persistProfile(profile: UserProfile) {
  const {
    userId, displayName, targetPosition, experienceLevel, strengths, weaknesses,
  } = profile;
  localStorage.setItem(
    STORAGE_KEYS.userProfile,
    JSON.stringify({ userId, displayName, targetPosition, experienceLevel, strengths, weaknesses }),
  );
}

interface UserState extends UserProfile {
  /** JWT token（登录成功后由 AuthPage 写入） */
  token: string | null;
  username: string;
  isLoggedIn: boolean;
  setAuth: (auth: { token: string; userId: string; username: string; displayName: string }) => void;
  clearAuth: () => void;
  setProfile: (profile: Partial<UserProfile>) => void;
  resetProfile: () => void;
  /** 登录后从服务器拉取画像并覆盖本地（匿名用户跳过） */
  loadProfileFromServer: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  ...loadProfile(),
  token: null,
  username: '',
  isLoggedIn: false,

  setAuth: (auth) => {
    setToken(auth.token);
    set({
      token: auth.token,
      userId: auth.userId,
      username: auth.username,
      displayName: auth.displayName,
      isLoggedIn: true,
      // 登录：画像字段一律回默认，只信服务器拉取结果，防止换号/拉取失败时残留上一账号画像
      targetPosition: '',
      experienceLevel: '',
      strengths: '',
      weaknesses: '',
    });
    // 登录：清空游客期间残留的本地历史（防止 anonymous 记录串入账号），再拉取该账号自己的记录
    useInterviewStore.getState().resetHistory();
    void useInterviewStore.getState().fetchHistory();
    // 登录：拉取服务器打卡记录并合并本地，写回后广播刷新打卡足迹（失败静默，保留本地下次打卡同步）
    void syncCheckInDatesFromServer(auth.userId).then((dates) => {
      notifyCheckInUpdated(dates);
    });
  },

  clearAuth: () => {
    setToken(null);
    set({
      token: null,
      username: '',
      isLoggedIn: false,
      userId: DEFAULT_PROFILE.userId,
      displayName: DEFAULT_PROFILE.displayName,
      targetPosition: DEFAULT_PROFILE.targetPosition,
      experienceLevel: DEFAULT_PROFILE.experienceLevel,
      strengths: DEFAULT_PROFILE.strengths,
      weaknesses: DEFAULT_PROFILE.weaknesses,
    });
    localStorage.removeItem(STORAGE_KEYS.userProfile);
    // 退出登录：清空本地历史且不再拉取匿名记录——退出后不应看到任何历史记录与上一账号画像
    useInterviewStore.getState().resetHistory();
  },

  setProfile: (profile) => {
    const next = { ...get(), ...profile };
    set(next);
    persistProfile(next);
    // 已登录：乐观更新本地后异步同步到后端（失败静默，下次保存时重试）
    if (get().isLoggedIn) {
      userApi.updateProfile(profile).catch(() => {});
    }
  },

  resetProfile: () => {
    set(DEFAULT_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.userProfile);
    if (get().isLoggedIn) {
      userApi.updateProfile(DEFAULT_PROFILE).catch(() => {});
    }
  },

  loadProfileFromServer: async () => {
    if (!get().isLoggedIn) return;
    try {
      const remote = await userApi.getProfile();
      set({
        userId: remote.userId,
        displayName: remote.displayName,
        targetPosition: remote.targetPosition,
        experienceLevel: remote.experienceLevel,
        strengths: remote.strengths,
        weaknesses: remote.weaknesses,
      });
      persistProfile(remote);
    } catch {
      // 服务器不可用时保留本地画像，下次进入页面重试
    }
  },
}));
