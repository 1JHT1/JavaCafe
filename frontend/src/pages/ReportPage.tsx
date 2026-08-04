/**
 * ReportPage —— 杯测报告页（规范文档 8.3）
 *
 * 协调链路（与后端契约对齐）：
 *   报告来源优先级：
 *     1. 本次会话 store.report（经 SSE report 事件 + normalizeReport 解析）
 *     2. 本地历史 history（localStorage 兜底，见 interviewStore.addToHistory）
 *   后端暂无 GET /api/interview/report/{sessionId} 查询接口，提供后可切换为接口拉取。
 *   report 事件推送的是 LLM 自由文本，解析失败时展示降级报告 + 原始文本（rawText）。
 */
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, RotateCcw, Sparkles, AlertTriangle } from 'lucide-react';
import { useInterviewStore } from '@/stores/interviewStore';
import { formatDateTime, reportModeLabel } from '@/utils/format';
import type { CupNoteReport, FallbackReport } from '@/types/report';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { CoffeeCup } from '@/components/coffee/CoffeeCup';
import { ScoreCircle } from '@/components/report/ScoreCircle';
import { StrengthList } from '@/components/report/StrengthList';
import { WeaknessList } from '@/components/report/WeaknessList';
import { SuggestionSection } from '@/components/report/SuggestionCard';

/** 类型守卫：是否为降级报告（LLM 自由文本未解析为结构化 JSON） */
function isFallbackReport(report: CupNoteReport | FallbackReport): report is FallbackReport {
  return 'rawText' in report;
}

export default function ReportPage() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const liveReport = useInterviewStore((s) => s.report);
  const history = useInterviewStore((s) => s.history);

  const report = useMemo(() => {
    if (liveReport && (!sessionId || liveReport.sessionId === sessionId)) return liveReport;
    return history.find((r) => r.sessionId === sessionId) ?? null;
  }, [liveReport, history, sessionId]);

  if (!report) {
    return (
      <EmptyState
        icon="📋"
        title="还没有这份杯测报告"
        description="报告可能已过期或会话已结束，返回菜单开始一场新的面试吧"
        action={
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
            返回咖啡菜单
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl animate-fade-in flex-col gap-5">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-brown-500 transition-colors hover:text-brown-700"
        >
          <ArrowLeft className="h-4 w-4" />
          返回菜单
        </button>
        <div className="flex items-center gap-2">
          <CoffeeCup className="h-6 w-6 text-accent" />
          <h1 className="font-display text-lg font-bold text-brown-900">杯测报告</h1>
        </div>
      </div>

      {/* 总览卡片 */}
      <section className="flex flex-col items-center gap-6 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-brown-100 sm:flex-row sm:items-center">
        <ScoreCircle score={report.score} size={140} />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="flex items-center justify-center gap-1.5 text-xs text-brown-500 sm:justify-start">
            <Calendar className="h-3.5 w-3.5" />
            {formatDateTime(report.createdAt)}
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-brown-900">
            {reportModeLabel(report.mode)}面试 · 杯测报告
          </h2>
          <p className="mt-1 text-xs text-brown-500">
            共 {report.totalRounds} 轮 · 会话 {report.sessionId}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-brown-700/90">{report.summary}</p>
        </div>
      </section>

      {/* 三栏明细 */}
      <div className="grid gap-5 md:grid-cols-3">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brown-100">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-brown-900">
            <Sparkles className="h-5 w-5 text-success" />
            优势亮点
          </h3>
          <StrengthList strengths={report.strengths} />
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brown-100">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-brown-900">
            <AlertTriangle className="h-5 w-5 text-warning" />
            薄弱环节
          </h3>
          <WeaknessList weaknesses={report.weaknesses} />
        </section>

        <SuggestionSection suggestions={report.suggestions} />
      </div>

      {/* 降级报告：展示原始 LLM 文本 */}
      {isFallbackReport(report) && (
        <details className="group rounded-3xl bg-white/70 p-6 ring-1 ring-brown-100">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-brown-500 transition-colors hover:text-brown-700">
            <FileText className="h-4 w-4" />
            查看咖啡师的原始笔记（结构化解析降级方案）
            <span className="ml-auto text-xs text-brown-300 group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <pre className="mt-4 max-h-80 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-brown-700/80">
            {report.rawText}
          </pre>
        </details>
      )}

      {/* 底部操作 */}
      <div className="flex justify-center gap-3 pb-6">
        <Button variant="secondary" onClick={() => navigate('/history')}>
          <RotateCcw className="h-4 w-4" />
          查看历史报告
        </Button>
        <Button onClick={() => navigate('/')}>
          <CoffeeCup className="h-4 w-4" />
          再来一杯
        </Button>
      </div>
    </div>
  );
}
