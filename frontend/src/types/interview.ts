/**
 * 面试相关类型 —— 与后端 javacafe-api 模块 DTO 对齐
 * 对应：StartInterviewRequest / UserAnswerRequest / BusinessConstants.InterviewMode
 */

/** 面试模式枚举（后端 BusinessConstants.InterviewMode） */
export type InterviewMode = 'POUR_OVER' | 'AMERICANO' | 'LATTE' | 'SPECIAL';

/** 咖啡菜单元信息（前端 URL 路径 ↔ 后端枚举映射，见规范附录 B） */
export interface CoffeeModeMeta {
  /** URL 路径片段，如 pour-over */
  path: string;
  /** 后端枚举值 */
  enum: InterviewMode;
  /** 中文名 */
  name: string;
  /** 英文名 */
  subName: string;
  /** 描述 */
  description: string;
  /** 图标（emoji 或 lucide 名称） */
  icon: string;
  /** 是否需要简历 */
  needResume?: boolean;
}

/** 开始面试请求（后端 StartInterviewRequest） */
export interface StartInterviewRequest {
  mode: InterviewMode;
  /** 简历文件 ID（手冲模式可选） */
  resumeId?: string;
}

/** 提交回答请求（后端 UserAnswerRequest） */
export interface UserAnswerRequest {
  sessionId: string;
  answer: string;
}

/** 通用响应体（后端 ApiResponse<T>） */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

/** SSE 事件类型（后端 BusinessConstants.SSE_EVENT_*） */
export type SseEventType = 'question' | 'message' | 'report' | 'complete' | 'error';

/** 解析后的 SSE 事件 */
export interface SseEvent {
  type: SseEventType;
  data: string;
}

/** 对话消息 */
export interface ChatMessage {
  id: string;
  role: 'interviewer' | 'user';
  content: string;
  timestamp: number;
}
