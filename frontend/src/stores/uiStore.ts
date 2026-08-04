/**
 * UI 状态（规范文档 7.3）—— 主题、侧栏、全局提示
 */
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light'; // 暂只有 light（咖啡主题）
  toastMessage: string | null;

  toggleSidebar: () => void;
  showToast: (msg: string) => void;
  clearToast: () => void;
}

export const useUiStore = create<UIState>((set) => ({
  sidebarOpen: false,
  theme: 'light',
  toastMessage: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  showToast: (toastMessage) => set({ toastMessage }),
  clearToast: () => set({ toastMessage: null }),
}));
