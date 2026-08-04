/**
 * 前端常量 —— 咖啡菜单映射（规范附录 B）与本地存储键
 */
import type { CoffeeModeMeta, InterviewMode } from '@/types/interview';

/** 咖啡菜单 4 种模式：URL 路径 ↔ 后端枚举 ↔ 展示信息 */
export const COFFEE_MENU: CoffeeModeMeta[] = [
  {
    path: 'pour-over',
    enum: 'POUR_OVER',
    name: '手冲',
    subName: 'Pour-over',
    description: '项目深挖 · 连环追问',
    icon: '🫘',
    needResume: true,
  },
  {
    path: 'americano',
    enum: 'AMERICANO',
    name: '美式',
    subName: 'Americano',
    description: '系统设计 · 架构视野',
    icon: '☕',
  },
  {
    path: 'latte',
    enum: 'LATTE',
    name: '拿铁',
    subName: 'Latte',
    description: '八股文问答 · Java基础',
    icon: '🤎',
  },
  {
    path: 'special',
    enum: 'SPECIAL',
    name: '当季特调',
    subName: 'Season Special',
    description: '综合模拟 · 随机题型',
    icon: '✨',
  },
];

/** 通过 URL 路径片段查找咖啡菜单项 */
export function findMenuByPath(path: string): CoffeeModeMeta | undefined {
  return COFFEE_MENU.find((item) => item.path === path);
}

/** URL 路径片段 → 后端枚举（规范附录 B 的 MODE_MAP 等价实现） */
export function pathToEnum(path: string): InterviewMode {
  return findMenuByPath(path)?.enum ?? 'LATTE';
}

/** 后端枚举 → 中文名（用于报告/历史展示） */
export function modeToChinese(mode: InterviewMode | string): string {
  return COFFEE_MENU.find((item) => item.enum === mode)?.name ?? mode;
}

/** 默认最大面试轮数（后端 StartInterviewRequest 默认值一致） */
export const DEFAULT_MAX_ROUNDS = 10;

/** 本地存储键 */
export const STORAGE_KEYS = {
  /** 面试历史报告列表 */
  reportHistory: 'javacafe.report.history',
  /** 用户画像 */
  userProfile: 'javacafe.user.profile',
  /** 已上传简历元信息 */
  resumeMeta: 'javacafe.resume.meta',
  /** 每日签到日期（yyyy-MM-dd） */
  checkInDate: 'javacafe.checkin.date',
} as const;
