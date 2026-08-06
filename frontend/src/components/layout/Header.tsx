/**
 * Header —— 顶栏导航（logo + 主导航 + 移动端侧栏开关）
 */
import { NavLink } from 'react-router-dom';
import { Menu, History, User, LogOut } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUiStore } from '@/stores/uiStore';
import { useUserStore } from '@/stores/userStore';
import { CoffeeCup } from '@/components/coffee/CoffeeCup';

export const NAV_ITEMS = [
  { to: '/', label: '咖啡菜单', match: 'end' as const },
  { to: '/history', label: '历史报告' },
  { to: '/profile', label: '个人中心' },
];

export function Header() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const { isLoggedIn, username, displayName, clearAuth } = useUserStore();

  const handleLogout = () => {
    clearAuth();
    if (window.location.pathname === '/auth') window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-40 border-b border-brown-100 bg-cream/80 backdrop-blur-md">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        {/* 左侧：logo + 品牌 */}
        <NavLink to="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brown-700 shadow-sm">
            <CoffeeCup className="h-6 w-6" />
          </span>
          <span className="hidden sm:block">
            <span className="block font-display text-lg font-bold leading-tight text-brown-900">JavaCafe</span>
            <span className="block text-[10px] leading-tight text-brown-500">AI 咖啡面试官</span>
          </span>
        </NavLink>

        {/* 中间：主导航（桌面） */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.match === 'end'}
              className={({ isActive }) =>
                cn(
                  'rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-brown-700 text-cream' : 'text-brown-700 hover:bg-brown-100',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 右侧：用户区 + 图标导航 */}
        <div className="flex items-center gap-1">
          {/* 用户区（桌面） */}
          {isLoggedIn ? (
            <div className="mr-1 hidden items-center gap-2 md:flex">
              <span className="max-w-[120px] truncate text-sm font-medium text-brown-700">
                {displayName || username}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                title="退出登录"
                className="flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-medium text-brown-500 transition-colors hover:bg-brown-100 hover:text-brown-700"
              >
                <LogOut className="h-4 w-4" />
                退出
              </button>
            </div>
          ) : (
            <NavLink
              to="/auth"
              className={({ isActive }) =>
                cn(
                  'mr-1 hidden items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors md:flex',
                  isActive ? 'bg-brown-700 text-cream' : 'text-brown-700 hover:bg-brown-100',
                )
              }
            >
              登录
            </NavLink>
          )}
          {/* 移动端：个人中心图标（未登录时指向登录页） */}
          <NavLink
            to={isLoggedIn ? '/profile' : '/auth'}
            title={isLoggedIn ? '个人中心' : '登录'}
            className={({ isActive }) =>
              cn(
                'flex h-9 w-9 items-center justify-center rounded-xl text-brown-700 transition-colors md:hidden',
                isActive ? 'bg-brown-700 text-cream' : 'hover:bg-brown-100',
              )
            }
          >
            <User className="h-5 w-5" />
          </NavLink>
          <NavLink
            to="/history"
            title="历史报告"
            className={({ isActive }) =>
              cn(
                'flex h-9 w-9 items-center justify-center rounded-xl text-brown-700 transition-colors md:hidden',
                isActive ? 'bg-brown-700 text-cream' : 'hover:bg-brown-100',
              )
            }
          >
            <History className="h-5 w-5" />
          </NavLink>
          {isLoggedIn && (
            <button
              type="button"
              onClick={handleLogout}
              title="退出登录"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-brown-700 transition-colors hover:bg-brown-100 md:hidden"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            title="菜单"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-brown-700 transition-colors hover:bg-brown-100"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
