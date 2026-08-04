/**
 * 用户相关类型 —— 与后端 javacafe-api 模块 UserProfileDto 对齐
 */

/** 用户画像（后端 UserProfileDto） */
export interface UserProfile {
  userId: string;
  displayName: string;
  targetPosition: string;
  experienceLevel: string;
  strengths: string;
  weaknesses: string;
}

/**
 * 简历文件元信息。
 * 后端目前仅有 ResumeParsingTool（按 resumeId 从本地 data/resumes 目录读取），
 * 尚无上传接口 —— 前端先本地持久化文件名，构造 resumeId 后传给后端解析。
 */
export interface ResumeMeta {
  id: string;
  fileName: string;
  uploadedAt: string;
}
