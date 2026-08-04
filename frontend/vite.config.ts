import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import type { ServerResponse } from 'http';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // SSE 流式响应需要关闭缓冲，保证逐字输出
  const configureProxy: ProxyOptions['configure'] = (proxy) => {
    proxy.on('proxyRes', (proxyRes: ServerResponse) => {
      proxyRes.headers['Cache-Control'] = 'no-cache';
      proxyRes.headers['X-Accel-Buffering'] = 'no';
    });
  };

  return {
    plugins: [react()],
    // 路径别名与 tsconfig.json 的 paths 保持一致
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // 后端 SecurityConfig 禁用了 CORS，前端必须通过代理访问 /api
      // 这样 SSE 流式连接与普通请求均免跨域，且无需携带 JWT（/api/interview/** 已 permitAll）
      proxy: {
        '/api': {
          target: env.VITE_API_BASE || 'http://localhost:8080',
          changeOrigin: true,
          configure: configureProxy,
        },
      },
    },
  };
});
