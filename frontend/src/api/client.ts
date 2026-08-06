/**
 * HTTP 客户端 —— fetch 封装
 *
 * 协调说明：
 * 1. 后端 SecurityConfig 禁用了 CORS，因此开发环境默认走 Vite 代理（相对路径 /api），
 *    生产/直连时可通过 VITE_API_BASE 指向后端地址。
 * 2. 后端统一响应体为 ApiResponse<T>（code=200 成功），此处统一解包与错误处理。
 * 3. 后端 /api/interview/** 为 permitAll，无需 JWT；若后续加鉴权，在 getToken() 处接入。
 */
import type { ApiResponse } from './types';
import { STORAGE_KEYS } from '@/utils/constants';

const BASE_URL = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** 从 localStorage 读取 JWT token（AuthPage 登录成功后写入） */
export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.token);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(STORAGE_KEYS.token, token);
  else localStorage.removeItem(STORAGE_KEYS.token);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // FormData 由浏览器自动设置 multipart 边界，不能手动指定 Content-Type
  const isFormData = init.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (!isFormData) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, '网络连接失败，请确认后端服务已启动');
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new ApiError(res.status, err.message || `请求失败 (HTTP ${res.status})`);
  }

  const body = (await res.json()) as ApiResponse<T>;
  if (body.code !== 200) {
    throw new ApiError(body.code, body.message || '业务处理失败');
  }
  return body.data;
}

export const http = {
  get<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'GET' });
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },
};
