/**
 * 认证接口 —— /api/auth/register | /api/auth/login
 * 登录/注册成功后前端将 token 存入 localStorage（client.getToken 自动携带）。
 */
import { http } from './client';

export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
  displayName: string;
}

export const authApi = {
  register: (data: { username: string; password: string; displayName?: string }) =>
    http.post<AuthResponse>('/api/auth/register', data),

  login: (data: { username: string; password: string }) =>
    http.post<AuthResponse>('/api/auth/login', data),
};
