/**
 * 历史记录 / 报告查询 API —— 与后端 HistoryController 对应
 *
 * 协调说明：后端 GET /api/interview/history 按 userId（JWT 解析，未登录为 anonymous）
 * 倒序返回会话摘要；GET /api/interview/report/{sessionId} 返回原始报告文本，
 * 前端复用 normalizeReport 降级解析（与 SSE report 事件同一链路）；
 * GET /api/interview/history/{sessionId}/download 返回 Markdown 附件，
 * 前端用 Blob 触发浏览器保存，不写入 data/reports（后端不落盘文件）。
 */
import { downloadFile, http } from './client';
import type { InterviewRecord, SessionSummary } from '@/types/report';

export const historyApi = {
  /** 当前用户的历史会话摘要列表（最新在前） */
  getHistory: () => http.get<SessionSummary[]>('/api/interview/history'),

  /** 按 sessionId 拉取原始报告文本 */
  getReport: (sessionId: string) =>
    http.get<string>(`/api/interview/report/${encodeURIComponent(sessionId)}`),

  /** 按 sessionId 拉取该会话的完整对话记录（题目/回答/评估，轮次升序） */
  getRecords: (sessionId: string) =>
    http.get<InterviewRecord[]>(`/api/interview/history/${encodeURIComponent(sessionId)}/records`),

  /** 下载该会话的杯测报告（后端排版为 Markdown 附件，浏览器直接保存） */
  downloadReport: async (sessionId: string): Promise<void> => {
    const blob = await downloadFile(
      `/api/interview/history/${encodeURIComponent(sessionId)}/download`,
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `javacafe-report-${sessionId.slice(0, 12)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /** 删除一条历史会话（后端记录，本地缓存由调用方同步清理） */
  deleteHistory: (sessionId: string) =>
    http.delete<void>(`/api/interview/history/${encodeURIComponent(sessionId)}`),
};
