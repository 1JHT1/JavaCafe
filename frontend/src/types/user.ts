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
 * 简历文件元信息（后端 ResumeMetaDto）。
 * id = 清洗后的文件名，即 ResumeParsingTool 读取所用的 resumeId。
 */
export interface ResumeMeta {
  id: string;
  fileName: string;
  uploadedAt: string;
}

/** 简历纯文本内容（后端 ResumeContentDto），用于前端回显预览 */
export interface ResumeContent {
  id: string;
  fileName: string;
  content: string;
}
