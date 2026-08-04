/**
 * CoffeeMenuGrid —— 咖啡菜单 2×2 宫格（首页核心区）
 */
import { COFFEE_MENU } from '@/utils/constants';
import { CoffeeMenuCard } from './CoffeeMenuCard';

export function CoffeeMenuGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {COFFEE_MENU.map((item) => (
        <CoffeeMenuCard key={item.path} item={item} />
      ))}
    </div>
  );
}
