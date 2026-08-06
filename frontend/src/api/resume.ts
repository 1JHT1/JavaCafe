/**
 * 简历上传 API —— 与后端 ResumeController 对应
 *
 * 协调说明：后端 upload 将文件落盘到 data/resumes/{清洗后文件名}，
 * resumeId = 文件名（ResumeParsingTool 按此读取），uploadedAt 由后端生成。
 */
import { http } from './client';
import type { ResumeContent, ResumeMeta } from '@/types/user';

export const resumeApi = {
  /** 上传简历文件，返回后端生成的元信息（id = 清洗后文件名） */
  upload(file: File): Promise<ResumeMeta> {
    const form = new FormData();
    form.append('file', file);
    return http.post<ResumeMeta>('/api/resume/upload', form);
  },

  /** 按 resumeId 拉取简历纯文本内容（前端回显预览） */
  get(id: string): Promise<ResumeContent> {
    return http.get<ResumeContent>(`/api/resume/${encodeURIComponent(id)}`);
  },
};
