/**
 * RecordDialog —— 历史报告"查看对话记录"弹窗
 *
 * 数据来源：后端 GET /api/interview/history/{sessionId}/records（按 userId 鉴权），
 * 返回该会话每轮的题目 / 回答 / 评估，按轮次升序；展示时轮次从 1 开始。
 */
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { historyApi } from '@/api/history';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import type { InterviewRecord } from '@/types/report';
import { formatDateTime, reportModeLabel } from '@/utils/format';
import type { InterviewReport } from '@/stores/interviewStore';

interface RecordDialogProps {
  open: boolean;
  /** 正在查看的报告（提供 sessionId / mode，便于标题与请求） */
  report: InterviewReport | null;
  onClose: () => void;
}

export function RecordDialog({ open, report, onClose }: RecordDialogProps) {
  const [records, setRecords] = useState<InterviewRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(false);
    try {
      const data = await historyApi.getRecords(sessionId);
      setRecords(data);
    } catch {
      // 会话不存在 / 无权限 / 后端不可用时提示重试，保持弹窗可关闭
      setError(true);
      setRecords(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 打开弹窗或切换报告时拉取对应会话的对话记录
  useEffect(() => {
    if (!open || !report) return;
    setRecords(null);
    void load(report.sessionId);
  }, [open, report, load]);

  return (
    <Modal
      open={open}
      size="lg"
      title={report ? `对话记录 · ${reportModeLabel(report.mode)}面试` : '对话记录'}
      onClose={onClose}
    >
      <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
        {loading && (
          <div className="flex flex-col items-center gap-2 py-10 text-brown-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">正在翻阅咖啡师的笔记…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-10">
            <p className="text-sm text-brown-500">对话记录加载失败，请稍后重试</p>
            <Button variant="outline" size="sm" onClick={() => report && load(report.sessionId)}>
              重试
            </Button>
          </div>
        )}

        {!loading && !error && records && records.length === 0 && (
          <p className="py-10 text-center text-sm text-brown-400">该会话暂无对话记录</p>
        )}

        {!loading &&
          !error &&
          records?.map((r) => (
            <article
              key={`${r.sessionId}-${r.roundNumber}`}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brown-100"
            >
              <header className="mb-2 flex flex-wrap items-center gap-2 text-xs text-brown-500">
                <span className="font-medium text-brown-700">第 {r.roundNumber + 1} 轮</span>
                {r.topic && (
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 font-medium text-accent-dark">
                    {r.topic}
                  </span>
                )}
                {r.createdAt && <span className="ml-auto">{formatDateTime(r.createdAt)}</span>}
              </header>

              <div className="flex flex-col gap-2 text-sm leading-relaxed">
                <p className="whitespace-pre-wrap break-words rounded-xl bg-cream px-3 py-2 text-brown-900 ring-1 ring-brown-100">
                  <span className="mr-1" aria-hidden>
                    ☕
                  </span>
                  {r.question}
                </p>
                <p className="whitespace-pre-wrap break-words rounded-xl bg-brown-700 px-3 py-2 text-cream">
                  <span className="mr-1" aria-hidden>
                    👤
                  </span>
                  {r.answer}
                </p>
                {r.evaluation && (
                  <p className="whitespace-pre-wrap break-words rounded-xl border-l-2 border-accent bg-accent/5 px-3 py-2 text-brown-700/90">
                    <span className="mr-1" aria-hidden>
                      📝
                    </span>
                    {r.evaluation}
                  </p>
                )}
              </div>
            </article>
          ))}
      </div>
    </Modal>
  );
}
