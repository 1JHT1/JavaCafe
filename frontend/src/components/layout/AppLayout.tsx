/**
 * AppLayout —— 全局布局壳（Header + 内容区 + Footer）
 */
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-brown-900">
      <Header />
      <Sidebar />
      <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
