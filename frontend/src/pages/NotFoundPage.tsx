/**
 * NotFoundPage —— 404 页面
 */
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { CoffeeCup } from '@/components/coffee/CoffeeCup';
import { Button } from '@/components/common/Button';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <div className="relative">
        <CoffeeCup className="h-28 w-28 opacity-60" />
        <span className="absolute -right-6 -top-4 font-display text-6xl font-bold text-accent">404</span>
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold text-brown-900">这杯咖啡不在菜单上</h1>
        <p className="mt-2 text-sm text-brown-500">你访问的页面不存在或已被移走</p>
      </div>
      <Link to="/">
        <Button size="lg">
          <Home className="h-4 w-4" />
          回到咖啡菜单
        </Button>
      </Link>
    </div>
  );
}
