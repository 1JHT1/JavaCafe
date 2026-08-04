/**
 * API 层类型 —— 请求/响应契约（与后端 DTO 对齐）
 * 集中导出，便于接口协调维护
 */
export type {
  ApiResponse,
  ChatMessage,
  CoffeeModeMeta,
  InterviewMode,
  SseEvent,
  SseEventType,
  StartInterviewRequest,
  UserAnswerRequest,
} from '@/types/interview';

export type { CupNoteReport, FallbackReport, StrengthPoint, WeaknessPoint } from '@/types/report';

export type { ResumeMeta, UserProfile } from '@/types/user';
