/**
 * HistoryPage —— 历史杯测报告页（规范文档 8.4）
 *
 * 协调说明：后端暂无历史记录接口，数据来自 interviewStore.history
 * （报告完成后 addToHistory 写入 localStorage 兜底）。
 * 等后端提供 GET /api/interview/history 后切换为接口拉取。
 */
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, Coffee } from 'lucide-react';
import { useInterviewStore } from '@/stores/interviewStore';
import { formatDate, reportModeLabel } from '@/utils/format';
import { COFFEE_MENU } from '@/utils/constants';
import type { InterviewMode } from '@/types/interview';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ScoreCircle } from '@/components/report/ScoreCircle';

/** 模式 emoji（与咖啡菜单图标一致） */
function modeIcon(mode: InterviewMode | string): string {
  return COFFEE_MENU.find((item) => item.enum === mode)?.icon ?? '☕';
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const history = useInterviewStore((s) => s.history);

  if (history.length === 0) {
    return (
      <EmptyState
        icon="🗂️"
        title="还没有杯测记录"
        description="完成一场面试后，杯测报告会自动保存在这里"
        action={
          <Button onClick={() => navigate('/')}>
            <Coffee className="h-4 w-4" />
            去喝第一杯咖啡
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl animate-fade-in flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-brown-900">历史杯测报告</h1>
        <p className="mt-1 text-sm text-brown-500">共 {history.length} 份，点击卡片查看完整报告</p>
      </div>

      <ul className="flex flex-col gap-3">
        {history.map((report) => (
          <li key={report.sessionId}>
            <button
              type="button"
              onClick={() => navigate(`/report/${report.sessionId}`)}
              className="flex w-full items-center gap-4 rounded-3xl bg-white p-5 text-left shadow-sm ring-1 ring-brown-100 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <ScoreCircle score={report.score} size={72} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg">{modeIcon(report.mode)}</span>
                  <p className="font-display text-base font-bold text-brown-900">
                    {reportModeLabel(report.mode)}面试
                  </p>
                  <span className="ml-auto flex items-center gap-1 text-xs text-brown-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(report.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 truncate text-sm text-brown-700/80">{report.summary}</p>
                <p className="mt-1 text-xs text-brown-400">共 {report.totalRounds} 轮 · 会话 {report.sessionId}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-brown-300" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
