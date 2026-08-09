package com.javacafe.web.handler;

import com.javacafe.api.dto.StartInterviewRequest;
import com.javacafe.api.dto.UserAnswerRequest;
import com.javacafe.common.util.JsonUtils;
import com.javacafe.core.agent.InterviewAgent;
import com.javacafe.infra.entity.InterviewSessionEntity;
import com.javacafe.infra.memory.MemoryManager;
import com.javacafe.infra.repository.InterviewSessionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.core.scheduler.Schedulers;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 管理面试会话的 SSE（Server-Sent Events）事件流。
 * 每个会话拥有独立的 Sinks.Many，向已连接的客户端推送事件。
 */
@Component
public class SseEmitterHandler {

    private final InterviewAgent interviewAgent;
    private final InterviewSessionRepository sessionRepository;
    private final MemoryManager memoryManager;
    private final Map<String, SessionContext> sessions = new ConcurrentHashMap<>();

    /**
     * 重放缓存大小：刷新/断连后重连时，sink 重放最近 N 个事件供前端按序号去重续传。
     * 断连窗口（几秒~几十秒）内 AI 输出的分片通常远小于该值，能完整覆盖一次长输出。
     */
    private static final int MAX_REPLAY_EVENTS = 1000;

    public SseEmitterHandler(InterviewAgent interviewAgent,
                             InterviewSessionRepository sessionRepository,
                             MemoryManager memoryManager) {
        this.interviewAgent = interviewAgent;
        this.sessionRepository = sessionRepository;
        this.memoryManager = memoryManager;
    }

    public void registerSession(String sessionId, String userId, StartInterviewRequest request) {
        // replay sink：无订阅者时事件进入重放缓存而非丢弃。
        // 刷新/断连后重连时，新订阅者先收到最近 MAX_REPLAY_EVENTS 个事件（事件带会话内序号 id），
        // 前端按序号跳过已处理事件，实现断连期间的输出续传而不重复。
        Sinks.Many<ServerSentEvent<String>> sink = Sinks.many().replay().limit(MAX_REPLAY_EVENTS);
        SessionContext ctx = new SessionContext(sessionId, userId, request, sink, new AtomicBoolean(false),
                new AtomicInteger(0), new AtomicBoolean(false), new AtomicLong(0));
        sessions.put(sessionId, ctx);
        // 注意：不在这里启动 LLM —— 事件序号从首个订阅者订阅后开始计数，
        // LLM 启动延迟到 getSessionStream 首个订阅者就绪后（见 startIfNeeded），
        // 保证会话内的 question/complete 事件序号连续、无缺口。
    }

    public Flux<ServerSentEvent<String>> getSessionStream(String sessionId) {
        SessionContext ctx = sessions.get(sessionId);
        if (ctx == null) {
            return Flux.just(event("error", "Session not found: " + sessionId));
        }
        // doOnSubscribe：订阅者注册到 sink 之后才启动 LLM，保证所有事件都有接收方
        return ctx.sink.asFlux()
                .doOnSubscribe(s -> startIfNeeded(ctx));
    }

    private void startIfNeeded(SessionContext ctx) {
        if (!ctx.started.compareAndSet(false, true)) return;
        interviewAgent.startSession(ctx.sessionId, ctx.userId, ctx.request)
                .map(content -> event("question", content, ctx.eventSeq.incrementAndGet()))
                .doOnNext(ctx.sink::tryEmitNext)
                .doOnComplete(() -> {
                    // AI 已提出第 1 题，计入轮次（轮次 = AI 出题数）
                    ctx.roundCount.incrementAndGet();
                    ctx.sink.tryEmitNext(event("complete", "{}", ctx.eventSeq.incrementAndGet()));
                })
                .doOnError(err -> ctx.sink.tryEmitNext(event("error", err.getMessage(), ctx.eventSeq.incrementAndGet())))
                .subscribe();
    }

    public void submitAnswer(UserAnswerRequest request) {
        SessionContext ctx = sessions.get(request.getSessionId());
        if (ctx == null) return;

        interviewAgent.processAnswer(ctx.sessionId, ctx.userId, request.getAnswer(), ctx.request.getMode())
                .map(content -> event("message", content, ctx.eventSeq.incrementAndGet()))
                .doOnNext(ctx.sink::tryEmitNext)
                .doOnComplete(() -> {
                    // AI 已提出下一题，计入轮次（轮次 = AI 出题数）
                    ctx.roundCount.incrementAndGet();
                    ctx.sink.tryEmitNext(event("complete", "{}", ctx.eventSeq.incrementAndGet()));
                })
                .doOnError(err -> ctx.sink.tryEmitNext(event("error", err.getMessage(), ctx.eventSeq.incrementAndGet())))
                .subscribe();
    }

    public void endSession(String sessionId) {
        SessionContext ctx = sessions.get(sessionId);
        if (ctx == null) return;
        startReportGeneration(ctx);
    }

    /**
     * 取消面试：丢弃会话、不生成报告，端掉 SSE 流并释放内存。
     * 与 endSession 的区别：会话不落库，历史中不会出现该记录，前端可回到点单页重新开始。
     */
    public void cancelSession(String sessionId) {
        SessionContext ctx = sessions.remove(sessionId);
        if (ctx == null) return;
        ctx.sink.tryEmitComplete();
        // 取消即丢弃：主动清理该会话的短期记忆，避免 Redis 残留到 TTL 过期
        memoryManager.endSession(sessionId);
    }

    /**
     * 生成报告并收尾会话（仅由用户主动结束触发）。
     * 以 reportStarted CAS 保证同一会话只生成一次报告。
     * 报告生成完成后将 InterviewSessionEntity 落库（transcript + report + score），
     * 后端重启后 HistoryPage / ReportPage 仍可查询（P1-3）。
     */
    private void startReportGeneration(SessionContext ctx) {
        if (!ctx.reportStarted.compareAndSet(false, true)) return;

        StringBuilder reportBuilder = new StringBuilder();
        interviewAgent.generateReport(ctx.sessionId, ctx.userId)
                .doOnNext(chunk -> {
                    reportBuilder.append(chunk);
                    ctx.sink.tryEmitNext(event("report", chunk, ctx.eventSeq.incrementAndGet()));
                })
                .doOnComplete(() -> {
                    ctx.sink.tryEmitNext(event("complete", "{}", ctx.eventSeq.incrementAndGet()));
                    ctx.sink.tryEmitComplete();
                    sessions.remove(ctx.sessionId);
                    String reportJson = reportBuilder.toString();
                    persistSession(ctx, reportJson);
                    // 报告弱点/优势回写用户画像，下次面试 prompt 会针对「待提升」着重考察（失败静默）
                    interviewAgent.learnFromReport(ctx.userId, reportJson);
                    // transcript 已在 persistSession 中同步取出，报告落库后主动清理短期记忆
                    memoryManager.endSession(ctx.sessionId);
                })
                .doOnError(err -> ctx.sink.tryEmitNext(event("error", err.getMessage())))
                .subscribe();
    }

    /**
     * 会话落库：transcript 取短期记忆全部对话，report 为报告原始文本，
     * score 从报告 JSON 宽松提取。阻塞 JPA 放 boundedElastic 异步执行，不阻塞 SSE complete 事件。
     * id 复用前端会话 UUID（ctx.sessionId），保证历史接口 sessionId 与前端一致，避免重复记录。
     */
    private void persistSession(SessionContext ctx, String reportJson) {
        String transcript = interviewAgent.getTranscript(ctx.sessionId);
        InterviewSessionEntity entity = InterviewSessionEntity.builder()
                .id(ctx.sessionId)
                .userId(ctx.userId)
                .mode(ctx.request.getMode().name())
                .transcriptJson(transcript)
                .reportJson(reportJson)
                .totalRounds(ctx.roundCount.get())
                .score(extractScore(reportJson))
                .completedAt(LocalDateTime.now())
                .build();
        Mono.fromRunnable(() -> sessionRepository.save(entity))
                .subscribeOn(Schedulers.boundedElastic())
                .subscribe();
    }

    private int extractScore(String reportJson) {
        if (reportJson == null || reportJson.isBlank()) return 0;
        try {
            JsonNode node = JsonUtils.fromJson(reportJson, JsonNode.class);
            if (node.has("score")) {
                return Math.max(0, Math.min(100, node.get("score").asInt()));
            }
        } catch (Exception ignored) {
            // 报告非严格 JSON（LLM 自由文本）时忽略，前端有降级解析
        }
        return 0;
    }

    private static ServerSentEvent<String> event(String type, String data) {
        return ServerSentEvent.<String>builder(data).event(type).build();
    }

    /** 带会话内事件序号（SSE id 字段）的事件：前端重连重放时按序号去重续传 */
    private static ServerSentEvent<String> event(String type, String data, long seq) {
        return ServerSentEvent.<String>builder(data).event(type).id(String.valueOf(seq)).build();
    }

    private record SessionContext(
            String sessionId,
            String userId,
            StartInterviewRequest request,
            Sinks.Many<ServerSentEvent<String>> sink,
            AtomicBoolean started,
            AtomicInteger roundCount,
            AtomicBoolean reportStarted,
            AtomicLong eventSeq
    ) {}
}
