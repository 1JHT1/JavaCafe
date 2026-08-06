/**
 * Sidebar —— 侧栏抽屉（右上角汉堡菜单展开内容）
 */
import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUiStore } from '@/stores/uiStore';
import { NAV_ITEMS } from './Header';

export function Sidebar() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  // 抽屉打开时锁定背景滚动
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className={cn('fixed inset-0 z-50', !sidebarOpen && 'pointer-events-none')} aria-hidden={!sidebarOpen}>
      {/* 遮罩 */}
      <div
        onClick={toggleSidebar}
        className={cn(
          'absolute inset-0 bg-brown-900/40 transition-opacity duration-300',
          sidebarOpen ? 'opacity-100' : 'opacity-0',
        )}
      />
      {/* 抽屉面板 */}
      <aside
        className={cn(
          'absolute right-0 top-0 flex h-full w-72 flex-col bg-cream shadow-2xl transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-brown-100 px-4">
          <span className="font-display text-lg font-bold text-brown-900">菜单</span>
          <button
            type="button"
            onClick={toggleSidebar}
            title="关闭菜单"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-brown-700 transition-colors hover:bg-brown-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.match === 'end'}
              onClick={toggleSidebar}
              className={({ isActive }) =>
                cn(
                  'rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                  isActive ? 'bg-brown-700 text-cream' : 'text-brown-700 hover:bg-brown-100',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </div>
  );
}
