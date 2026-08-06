import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AppLayout } from '@/components/layout/AppLayout';
import HomePage from '@/pages/HomePage';
import InterviewPage from '@/pages/InterviewPage';
import ReportPage from '@/pages/ReportPage';
import HistoryPage from '@/pages/HistoryPage';
import ProfilePage from '@/pages/ProfilePage';
import AuthPage from '@/pages/AuthPage';
import NotFoundPage from '@/pages/NotFoundPage';

/**
 * 路由设计（与前端规范文档第 6 节一致）
 *  /                  → 首页（咖啡菜单 + 每日一杯）
 *  /interview/:mode   → 面试页（latte / pour-over / americano / special）
 *  /report/:sessionId → 杯测报告页
 *  /history           → 历史记录页
 *  /profile           → 个人资料页
 *  /auth              → 登录 / 注册页
 */
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/interview/:mode" element={<InterviewPage />} />
            <Route path="/report/:sessionId" element={<ReportPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#3E2723',
              color: '#FFFAF5',
              borderRadius: '12px',
            },
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
