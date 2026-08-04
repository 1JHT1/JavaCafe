/**
 * CoffeeMenuCard —— 咖啡菜单卡片（规范文档附录 B）
 * 展示 4 种面试模式之一，点击进入对应面试页
 */
import { Link } from 'react-router-dom';
import { FileText, ArrowRight } from 'lucide-react';
import type { CoffeeModeMeta } from '@/types/interview';

interface CoffeeMenuCardProps {
  item: CoffeeModeMeta;
}

export function CoffeeMenuCard({ item }: CoffeeMenuCardProps) {
  return (
    <Link
      to={`/interview/${item.path}`}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brown-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brown-500/10 hover:ring-accent-light"
    >
      {/* 顶部装饰蒸汽 */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent-light/10 transition-transform duration-300 group-hover:scale-125" />

      <div className="flex items-start justify-between">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brown-100 text-3xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
          {item.icon}
        </span>
        {item.needResume && (
          <span className="flex items-center gap-1 rounded-full bg-accent-light/20 px-2 py-0.5 text-[10px] font-medium text-accent-dark">
            <FileText className="h-3 w-3" />
            建议上传简历
          </span>
        )}
      </div>

      <div>
        <h3 className="font-display text-xl font-bold text-brown-900">{item.name}</h3>
        <p className="text-sm text-brown-500">{item.subName}</p>
      </div>

      <p className="text-sm leading-relaxed text-brown-700/80">{item.description}</p>

      <span className="mt-auto flex items-center gap-1.5 text-sm font-medium text-accent transition-colors group-hover:text-accent-dark">
        开始面试
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
