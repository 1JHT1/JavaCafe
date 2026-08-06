/**
 * ReportPage —— 杯测报告页（规范文档 8.3）
 *
 * 协调链路（与后端契约对齐）：
 *   报告来源优先级：
 *     1. 本次会话 store.report（经 SSE report 事件 + normalizeReport 解析）
 *     2. 本地历史 history（localStorage 兜底，见 interviewStore.addToHistory）
 *     3. 后端 GET /api/interview/report/{sessionId}（历史会话详情，返回原始报告文本，
 *        前端 normalizeReport 降级解析，与 SSE report 事件同一链路）
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, RotateCcw, Sparkles, AlertTriangle } from 'lucide-react';
import { useInterviewStore, type InterviewReport } from '@/stores/interviewStore';
import { formatDateTime, normalizeReport, reportModeLabel } from '@/utils/format';
import { historyApi } from '@/api/history';
import { parseReportPayload } from '@/api/sse';
import type { InterviewMode } from '@/types/interview';
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
  // 报告可能在任意咖啡会话分区中（刚完成的面试），按 sessionId 匹配
  const sessions = useInterviewStore((s) => s.sessions);
  const history = useInterviewStore((s) => s.history);
  // 历史会话详情：本地没有时从后端拉取（原始报告文本 → normalizeReport 降级解析）
  const [remoteReport, setRemoteReport] = useState<InterviewReport | null>(null);

  const report = useMemo(() => {
    const modes = Object.keys(sessions) as InterviewMode[];
    for (const m of modes) {
      const r = sessions[m].report;
      if (r && (!sessionId || r.sessionId === sessionId)) return r;
    }
    return history.find((r) => r.sessionId === sessionId) ?? remoteReport;
  }, [sessions, history, remoteReport, sessionId]);

  // 本地（store.report / history）均无此会话时，回退到后端查询接口
  useEffect(() => {
    if (report || !sessionId) return;
    let cancelled = false;
    void historyApi
      .getReport(sessionId)
      .then((text) => {
        if (cancelled) return;
        const known = history.find((r) => r.sessionId === sessionId);
        setRemoteReport(
          normalizeReport(parseReportPayload(text), sessionId, known?.mode ?? ('SPECIAL' as InterviewMode), known?.totalRounds ?? 0),
        );
      })
      .catch(() => {
        // 会话不存在或暂无报告：保持空状态展示
      });
    return () => {
      cancelled = true;
    };
  }, [report, sessionId, history]);

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
    <div className="flex w-full animate-fade-in flex-col gap-5">
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
