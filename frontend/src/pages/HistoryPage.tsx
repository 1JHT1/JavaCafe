/**
 * HistoryPage —— 历史杯测报告页（规范文档 8.4）
 *
 * 协调说明：数据来源 = 后端 GET /api/interview/history（挂载时 fetchHistory 拉取并合并），
 * 后端不可用时降级为 interviewStore.history 本地缓存（localStorage 兜底）。
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, Coffee, Download, Loader2, MessageSquareText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useInterviewStore, type InterviewReport } from '@/stores/interviewStore';
import { formatDate, reportModeLabel } from '@/utils/format';
import { COFFEE_MENU } from '@/utils/constants';
import type { InterviewMode } from '@/types/interview';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Modal } from '@/components/common/Modal';
import { RecordDialog } from '@/components/report/RecordDialog';
import { ScoreCircle } from '@/components/report/ScoreCircle';
import { historyApi } from '@/api/history';
import { InsightsPanel } from '@/components/report/InsightsPanel';

/** 模式 emoji（与咖啡菜单图标一致） */
function modeIcon(mode: InterviewMode | string): string {
  return COFFEE_MENU.find((item) => item.enum === mode)?.icon ?? '☕';
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const history = useInterviewStore((s) => s.history);
  // 列表按分数从高到低展示（数据源保持最新在前，仅排序视图；同分保持原有顺序）
  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => b.score - a.score),
    [history],
  );
  // 待删除的记录（非 null 时弹出确认弹窗）
  const [pendingDelete, setPendingDelete] = useState<InterviewReport | null>(null);
  // 正在查看对话记录的报告（非 null 时弹出对话记录弹窗）
  const [viewingRecords, setViewingRecords] = useState<InterviewReport | null>(null);
  // 正在下载报告的 sessionId（非 null 时按钮转圈，防止重复点击）
  const [downloading, setDownloading] = useState<string | null>(null);

  // 挂载时从后端拉取历史会话（接口失败静默，保留本地缓存）
  useEffect(() => {
    void useInterviewStore.getState().fetchHistory();
  }, []);

  /** 下载杯测报告：后端排版为 Markdown 附件，浏览器直接保存 */
  const handleDownload = async (report: InterviewReport) => {
    setDownloading(report.sessionId);
    try {
      await historyApi.downloadReport(report.sessionId);
      toast.success('杯测报告已下载');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '下载失败，请稍后重试');
    } finally {
      setDownloading(null);
    }
  };

  /** 确认删除：本地先删（即时反馈，含纯本地记录），后端 best-effort 同步 */
  const confirmDelete = async (report: InterviewReport) => {
    setPendingDelete(null);
    useInterviewStore.getState().removeFromHistory(report.sessionId);
    try {
      await historyApi.deleteHistory(report.sessionId);
    } catch (err) {
      // 后端不可用 / 记录未落库（404）时静默：本地缓存已清理，与 fetchHistory 降级策略一致
      console.warn('后端删除失败（本地记录已清理）:', err);
    }
  };

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
    <div className="flex w-full animate-fade-in flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-brown-900">历史杯测报告</h1>
        <p className="mt-1 text-sm text-brown-500">
          共 {history.length} 份，点击卡片查看完整报告
          {history.length > 3 && '（记录较多，可左右滑动查看更多）'}
        </p>
      </div>

      {/* 记录列表：卡片固定宽 + 横向滚动，多于 3 条时滑动查看 */}
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {sortedHistory.map((report) => (
          <li key={report.sessionId} className="group w-96 shrink-0">
            <div className="flex items-stretch rounded-3xl bg-white p-5 shadow-sm ring-1 ring-brown-100 transition-all hover:shadow-md">
              <button
                type="button"
                onClick={() => navigate(`/report/${report.sessionId}`)}
                className="flex min-w-0 flex-1 items-center gap-4 text-left"
              >
                <ScoreCircle score={report.score} size={72} />
                <div className="min-w-0 flex-1">
                  {/* 标题行单行固定：禁止换行，标题超长截断、日期防收缩，保证各卡片等高 */}
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-lg">{modeIcon(report.mode)}</span>
                    <p className="min-w-0 truncate font-display text-base font-bold text-brown-900">
                      {reportModeLabel(report.mode)}面试
                    </p>
                    <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-brown-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span className="whitespace-nowrap">{formatDate(report.createdAt)}</span>
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-sm text-brown-700/80">{report.summary}</p>
                  <p className="mt-1 truncate text-xs text-brown-400">
                    共 {report.totalRounds} 轮 · 会话 {report.sessionId}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-brown-300" />
              </button>
              <button
                type="button"
                aria-label="下载杯测报告"
                title="下载杯测报告"
                disabled={downloading !== null}
                onClick={() => void handleDownload(report)}
                className="self-center rounded-full p-2 text-brown-300 transition-colors hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {downloading === report.sessionId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                aria-label="查看对话记录"
                title="查看对话记录"
                onClick={() => setViewingRecords(report)}
                className="self-center rounded-full p-2 text-brown-300 transition-colors hover:bg-accent/10 hover:text-accent"
              >
                <MessageSquareText className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="删除这条记录"
                title="删除这条记录"
                onClick={() => setPendingDelete(report)}
                className="self-center rounded-full p-2 text-brown-300 transition-colors hover:bg-error/10 hover:text-error"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* 个人能力数据可视化框：多项能力雷达图 + 语言表达具体细节 */}
      <InsightsPanel reports={history} />

      {/* 删除确认弹窗 */}
      <Modal
        open={pendingDelete !== null}
        title="删除这条记录？"
        onClose={() => setPendingDelete(null)}
      >
        <p className="text-sm leading-relaxed text-brown-700/80">
          将永久删除
          <span className="font-medium text-brown-900">
            「{pendingDelete ? reportModeLabel(pendingDelete.mode) : ''}面试」
          </span>
          的杯测报告（{pendingDelete ? formatDate(pendingDelete.createdAt) : ''}），删除后不可恢复。
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setPendingDelete(null)}>
            取消
          </Button>
          <Button variant="danger" onClick={() => pendingDelete && confirmDelete(pendingDelete)}>
            确认删除
          </Button>
        </div>
      </Modal>

      {/* 对话记录弹窗 */}
      <RecordDialog
        open={viewingRecords !== null}
        report={viewingRecords}
        onClose={() => setViewingRecords(null)}
      />
    </div>
  );
}
