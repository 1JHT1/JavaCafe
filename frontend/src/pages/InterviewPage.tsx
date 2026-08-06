/**
 * InterviewPage —— 面试页（规范文档 8.2）
 *
 * 协调链路（与后端契约对齐）：
 *   开始面试   POST /api/interview/{mode}            → sessionId
 *   流式对话   GET  /api/interview/stream/{sessionId}（useSSE 自动建立）
 *   提交回答   POST /api/interview/answer
 *   结束面试   POST /api/interview/{sessionId}/end    → 报告经 SSE 推送
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useInterview } from '@/hooks/useInterview';
import { useUserStore } from '@/stores/userStore';
import { findMenuByPath, resumeMetaKey } from '@/utils/constants';
import type { ResumeMeta } from '@/types/user';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import { CoffeeBeanSpinner } from '@/components/interview/CoffeeBeanSpinner';
import { ChatBubble } from '@/components/interview/ChatBubble';
import { ChatInput } from '@/components/interview/ChatInput';
import { LatteHeart } from '@/components/interview/LatteHeart';
import { TypingIndicator } from '@/components/interview/TypingIndicator';
import { InterviewToolbar } from '@/components/interview/InterviewToolbar';

function loadResumeMeta(userId: string): ResumeMeta | null {
  try {
    const raw = localStorage.getItem(resumeMetaKey(userId));
    return raw ? (JSON.parse(raw) as ResumeMeta) : null;
  } catch {
    return null;
  }
}

export default function InterviewPage() {
  const { mode = '' } = useParams();
  const navigate = useNavigate();
  const menu = findMenuByPath(mode);
  const userId = useUserStore((s) => s.userId);
  const [resumeMeta, setResumeMeta] = useState<ResumeMeta | null>(() => loadResumeMeta(userId));

  // 登录态切换（登录/退出/换号）时，按当前 userId 重新读取简历关联
  useEffect(() => {
    setResumeMeta(loadResumeMeta(userId));
  }, [userId]);

  // 爱心拉花：提交回答成功后短暂浮现（动画结束后移除）
  const [showHeart, setShowHeart] = useState(false);
  const heartTimerRef = useRef<number | null>(null);

  // 取消面试确认弹窗
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const {
    sessionId,
    isActive,
    isStreaming,
    messages,
    currentRound,
    report,
    starting,
    sending,
    ending,
    sseStatus,
    error,
    startInterview,
    submitAnswer,
    endInterview,
    cancelInterview,
    clearError,
  } = useInterview(mode, { resumeId: resumeMeta?.id ?? undefined });

  // 自动滚动到底部
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  // 报告就绪 → 跳转报告页
  // 仅在会话刚结束的瞬间触发（isActive true→false 且报告就绪）；
  // 报告已存在时再次进入不跳转，停留在点单页等待用户重新点单。
  const prevActiveRef = useRef(isActive);
  useEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = isActive;
    if (wasActive && !isActive && report) {
      navigate(`/report/${report.sessionId || sessionId}`, { replace: true });
    }
  }, [isActive, report, sessionId, navigate]);

  // 卸载时清理爱心计时器
  useEffect(() => {
    return () => {
      if (heartTimerRef.current !== null) window.clearTimeout(heartTimerRef.current);
    };
  }, []);

  // 无效模式
  if (!menu) {
    return (
      <EmptyState
        icon="☕"
        title="没有这杯咖啡"
        description={`「${mode}」不在咖啡菜单上，返回菜单重新选择吧`}
        action={
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
            返回菜单
          </Button>
        }
      />
    );
  }

  const handleStart = async () => {
    if (menu.needResume && !resumeMeta) {
      toast.info('手冲模式建议先上传简历（个人中心），将更贴合你的项目经历');
    }
    await startInterview();
  };

  const handleSubmit = async (text: string) => {
    const ok = await submitAnswer(text);
    if (ok) {
      // 提交成功 → 浮现爱心拉花，1.7s 后淡出移除
      setShowHeart(true);
      if (heartTimerRef.current !== null) window.clearTimeout(heartTimerRef.current);
      heartTimerRef.current = window.setTimeout(() => setShowHeart(false), 1700);
    }
  };

  // 确认取消：放弃当前会话（不生成报告），回点单页可重新开始
  const handleCancel = async () => {
    setCancelConfirmOpen(false);
    await cancelInterview();
    navigate('/');
  };

  const inputDisabled = !isActive || isStreaming || sending || ending;

  return (
    <div className="flex flex-col gap-5">
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
          <span className="text-2xl">{menu.icon}</span>
          <div className="text-right">
            <h1 className="font-display text-lg font-bold text-brown-900">{menu.name}面试</h1>
            <p className="text-xs text-brown-500">{menu.description}</p>
          </div>
        </div>
      </div>

      {!isActive ? (
        /* ---- 面试开始前：介绍卡片 ---- */
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-brown-100 animate-fade-in">
          <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brown-100 text-5xl">
            {menu.icon}
          </span>
          <div>
            <h2 className="font-display text-2xl font-bold text-brown-900">{menu.name}</h2>
            <p className="mt-1 text-sm text-brown-500">{menu.subName}</p>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-brown-700/80">
              咖啡师将围绕「{menu.description}」持续提问，不设轮数上限。
              每轮回答后咖啡师会给出反馈与追问，聊得差不多时点击「结束面试」即可生成杯测报告。
            </p>
          </div>

          {menu.needResume && (
            <p className="flex items-center gap-1.5 rounded-xl bg-accent-light/10 px-3 py-1.5 text-xs text-accent-dark">
              <FileText className="h-3.5 w-3.5" />
              {resumeMeta ? `已关联简历：${resumeMeta.fileName}` : '尚未关联简历，将按通用项目经验提问'}
            </p>
          )}

          <Button size="lg" loading={starting} onClick={() => void handleStart()}>
            点单
          </Button>
        </div>
      ) : (
        /* ---- 面试进行中 ---- */
        <>
          <InterviewToolbar
            currentRound={currentRound}
            sseStatus={sseStatus}
            onEnd={() => void endInterview()}
            onCancel={() => setCancelConfirmOpen(true)}
          />

          {/* 消息列表 */}
          <div
            ref={listRef}
            className="relative flex h-[60vh] min-h-[420px] flex-col gap-4 overflow-y-auto rounded-3xl bg-white/60 p-5 ring-1 ring-brown-100"
          >
            {showHeart && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <LatteHeart className="h-16 w-16 animate-latte-heart" />
              </div>
            )}
            {messages.map((msg, index) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                streaming={index === messages.length - 1 && isStreaming && msg.role === 'interviewer'}
              />
            ))}
            {messages.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <CoffeeBeanSpinner className="h-12 w-12" />
                <p className="text-sm text-brown-500">咖啡师正在准备第一杯提问…</p>
              </div>
            )}
            {isStreaming && messages.length > 0 && (
              <TypingIndicator label={ending ? '正在撰写杯测报告' : '咖啡师正在思考'} />
            )}
          </div>

          {/* 输入区 */}
          <ChatInput disabled={inputDisabled} onSubmit={handleSubmit} />

          {ending && (
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-brown-700 px-4 py-3 text-sm text-cream">
              <CoffeeBeanSpinner className="h-5 w-5" />
              面试结束，正在萃取杯测报告…
            </div>
          )}
        </>
      )}

      {/* 取消面试确认弹窗 */}
      <Modal open={cancelConfirmOpen} title="取消这场面试？" onClose={() => setCancelConfirmOpen(false)}>
        <p className="text-sm leading-relaxed text-brown-700">
          当前对话不会生成杯测报告，返回点单页后可以重新开始一场新的面试。
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCancelConfirmOpen(false)}>
            继续面试
          </Button>
          <Button variant="danger" onClick={() => void handleCancel()}>
            取消面试
          </Button>
        </div>
      </Modal>

      {/* 错误弹窗 */}
      <Modal open={!!error} title="出了点状况" onClose={clearError}>
        <p className="text-sm leading-relaxed text-brown-700">{error}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={clearError}>
            知道了
          </Button>
        </div>
      </Modal>
    </div>
  );
}
