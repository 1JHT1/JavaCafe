/**
 * SSE 客户端 —— 封装 EventSource，处理 JavaCafe 事件协议
 *
 * 协议（与后端 BusinessConstants + InterviewAgent 对齐）：
 *   question  → AI 提出新问题（纯文本）
 *   message   → AI 的中间回复/评价（纯文本）
 *   report    → 面试结束，杯测报告（JSON 字符串或 LLM 自由文本，见 parseReport）
 *   complete  → 当前阶段对话结束，等待用户输入（data 为 "{}"）
 *   error     → 服务端错误（纯文本）
 *
 * 重连机制（规范文档 10.2）：断开后等待 3 秒重连，最多重试 3 次；
 * 浏览器对 EventSource 默认自动重连，此处通过事件监听手动控制更可靠。
 */
import type { SseEvent, SseEventType } from './types';

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 3;

export interface SseConnectionOptions {
  sessionId: string;
  onEvent: (event: SseEvent) => void;
  onStatusChange?: (status: 'connecting' | 'open' | 'reconnecting' | 'closed' | 'error') => void;
}

/** 解析 report 事件负载：优先 JSON，失败则原样返回（由调用方降级处理） */
export function parseReportPayload(data: string): Record<string, unknown> | string {
  const trimmed = data.trim();
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
  } catch {
    return trimmed;
  }
}

export class SseClient {
  private es: EventSource | null = null;
  private reconnectAttempts = 0;
  private manuallyClosed = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: SseConnectionOptions) {}

  connect(): void {
    if (this.es) this.disconnect();
    this.manuallyClosed = false;

    const base = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '');
    const url = `${base}/api/interview/stream/${this.options.sessionId}`;
    this.options.onStatusChange?.('connecting');
    const es = new EventSource(url);
    this.es = es;

    es.addEventListener('open', () => {
      this.reconnectAttempts = 0;
      this.options.onStatusChange?.('open');
    });

    es.addEventListener('question', (e) => this.dispatch('question', (e as MessageEvent).data, (e as MessageEvent).lastEventId));
    es.addEventListener('message', (e) => this.dispatch('message', (e as MessageEvent).data, (e as MessageEvent).lastEventId));
    es.addEventListener('report', (e) => this.dispatch('report', (e as MessageEvent).data, (e as MessageEvent).lastEventId));
    es.addEventListener('complete', (e) => this.dispatch('complete', '{}', (e as MessageEvent).lastEventId));
    es.addEventListener('error', (e) => {
      // EventSource 的 error 事件通道被两类事件共用：
      //   1) 网络/连接错误（Event 类型，无 data）→ 走重连逻辑
      //   2) 服务端推送的命名 error 事件（MessageEvent，带 data）→ 正常派发
      const ev = e as MessageEvent;
      if (ev.data != null) {
        this.dispatch('error', ev.data, ev.lastEventId);
        return;
      }
      this.handleError();
    });
  }

  private dispatch(type: SseEventType, data: string, lastEventId?: string): void {
    // SSE 事件 id（会话内序号）：用于刷新重连重放时去重，无 id 的旧版事件保持兼容
    const seq = lastEventId ? Number(lastEventId) : undefined;
    this.options.onEvent({
      type,
      data,
      ...(seq !== undefined && !Number.isNaN(seq) ? { seq } : {}),
    });
  }

  private handleError(): void {
    if (this.manuallyClosed || !this.es) return;

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.options.onStatusChange?.('error');
      this.disconnect();
      return;
    }

    this.reconnectAttempts += 1;
    this.options.onStatusChange?.('reconnecting');
    this.es?.close();
    this.es = null;
    this.retryTimer = setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
  }

  disconnect(): void {
    this.manuallyClosed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.es?.close();
    this.es = null;
    this.options.onStatusChange?.('closed');
  }
}
