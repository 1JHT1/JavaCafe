/**
 * 面试相关 API —— 与后端 InterviewController 路由一一对应
 *
 * POST /api/interview/{mode}        → 开始面试，返回 sessionId
 * POST /api/interview/answer        → 提交回答
 * POST /api/interview/{sessionId}/end → 结束面试并生成杯测报告（报告经 SSE 推送）
 */
import { http } from './client';
import type { StartInterviewRequest, UserAnswerRequest } from './types';

export const interviewApi = {
  /** 开始面试（4 种模式共用，mode 为 URL 路径片段） */
  start(mode: string, body: StartInterviewRequest): Promise<string> {
    return http.post<string>(`/api/interview/${mode}`, body);
  },

  /** 提交回答 */
  answer(body: UserAnswerRequest): Promise<string> {
    return http.post<string>('/api/interview/answer', body);
  },

  /** 结束面试，触发报告生成 */
  end(sessionId: string): Promise<string> {
    return http.post<string>(`/api/interview/${sessionId}/end`);
  },
};

/**
 * 预留接口 —— 后端尚未实现，等提供后可直接启用：
 *   - 简历上传：POST /api/resume  (multipart/form-data)
 *   - 历史记录：GET  /api/interview/history
 *   - 用户画像：GET/PUT /api/user/profile
 */
export const futureApi = {
  uploadResume: (file: File): Promise<never> => {
    void file;
    return Promise.reject(new Error('简历上传接口尚未开放'));
  },
};
