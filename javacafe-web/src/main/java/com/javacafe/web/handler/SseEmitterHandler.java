package com.javacafe.web.handler;

import com.javacafe.api.dto.StartInterviewRequest;
import com.javacafe.api.dto.UserAnswerRequest;
import com.javacafe.core.agent.InterviewAgent;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Manages SSE (Server-Sent Events) streams for interview sessions.
 * Each session gets a dedicated Sinks.Many that pushes events to connected clients.
 */
@Component
public class SseEmitterHandler {

    private final InterviewAgent interviewAgent;
    private final Map<String, SessionContext> sessions = new ConcurrentHashMap<>();

    public SseEmitterHandler(InterviewAgent interviewAgent) {
        this.interviewAgent = interviewAgent;
    }

    public void registerSession(String sessionId, String userId, StartInterviewRequest request) {
        Sinks.Many<ServerSentEvent<String>> sink = Sinks.many().multicast().onBackpressureBuffer();
        SessionContext ctx = new SessionContext(sessionId, userId, request, sink, new AtomicBoolean(false));
        sessions.put(sessionId, ctx);
        // 注意：不在这里启动 LLM —— multicast sink 在无订阅者时会丢弃事件。
        // LLM 启动延迟到 getSessionStream 首个订阅者就绪后（见 startIfNeeded），
        // 否则前端 SSE 连接建立前生成的 question/complete 事件全部丢失，表现为前端空转。
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
                .map(content -> event("question", content))
                .doOnNext(ctx.sink::tryEmitNext)
                .doOnComplete(() -> ctx.sink.tryEmitNext(event("complete", "{}")))
                .doOnError(err -> ctx.sink.tryEmitNext(event("error", err.getMessage())))
                .subscribe();
    }

    public void submitAnswer(UserAnswerRequest request) {
        SessionContext ctx = sessions.get(request.getSessionId());
        if (ctx == null) return;

        interviewAgent.processAnswer(ctx.sessionId, ctx.userId, request.getAnswer(), ctx.request.getMode())
                .map(content -> event("message", content))
                .doOnNext(ctx.sink::tryEmitNext)
                .doOnComplete(() -> ctx.sink.tryEmitNext(event("complete", "{}")))
                .doOnError(err -> ctx.sink.tryEmitNext(event("error", err.getMessage())))
                .subscribe();
    }

    public void endSession(String sessionId) {
        SessionContext ctx = sessions.get(sessionId);
        if (ctx == null) return;

        interviewAgent.generateReport(sessionId, ctx.userId)
                .map(content -> event("report", content))
                .doOnNext(ctx.sink::tryEmitNext)
                .doOnComplete(() -> {
                    ctx.sink.tryEmitNext(event("complete", "{}"));
                    ctx.sink.tryEmitComplete();
                    sessions.remove(sessionId);
                })
                .doOnError(err -> ctx.sink.tryEmitNext(event("error", err.getMessage())))
                .subscribe();
    }

    private static ServerSentEvent<String> event(String type, String data) {
        return ServerSentEvent.<String>builder(data).event(type).build();
    }

    private record SessionContext(
            String sessionId,
            String userId,
            StartInterviewRequest request,
            Sinks.Many<ServerSentEvent<String>> sink,
            AtomicBoolean started
    ) {}
}
