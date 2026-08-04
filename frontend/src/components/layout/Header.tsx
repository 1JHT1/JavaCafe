/**
 * Header —— 顶栏导航（logo + 主导航 + 移动端侧栏开关）
 */
import { NavLink } from 'react-router-dom';
import { Menu, History, User } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUiStore } from '@/stores/uiStore';
import { CoffeeCup } from '@/components/coffee/CoffeeCup';

const NAV_ITEMS = [
  { to: '/', label: '咖啡菜单', match: 'end' as const },
  { to: '/history', label: '历史报告' },
  { to: '/profile', label: '个人中心' },
];

export function Header() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <header className="sticky top-0 z-40 border-b border-brown-100 bg-cream/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
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

        {/* 右侧：图标导航 */}
        <div className="flex items-center gap-1">
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
          <NavLink
            to="/profile"
            title="个人中心"
            className={({ isActive }) =>
              cn(
                'flex h-9 w-9 items-center justify-center rounded-xl text-brown-700 transition-colors md:hidden',
                isActive ? 'bg-brown-700 text-cream' : 'hover:bg-brown-100',
              )
            }
          >
            <User className="h-5 w-5" />
          </NavLink>
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
