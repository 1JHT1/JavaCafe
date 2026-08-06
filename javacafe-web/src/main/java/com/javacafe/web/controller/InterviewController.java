package com.javacafe.web.controller;

import com.javacafe.api.dto.ApiResponse;
import com.javacafe.api.dto.StartInterviewRequest;
import com.javacafe.api.dto.UserAnswerRequest;
import com.javacafe.core.agent.InterviewAgent;
import com.javacafe.web.handler.SseEmitterHandler;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.UUID;

/**
 * 面试会话的 REST 控制器。
 * 路由映射采用架构中的咖啡菜单命名约定：
 *   - /api/interview/pour-over  → 手冲（项目深挖）
 *   - /api/interview/americano  → 美式（系统设计）
 *   - /api/interview/latte      → 拿铁（Java 基础）
 *   - /api/interview/special    → 当季特调（综合模拟面试）
 */
@RestController
@RequestMapping("/api/interview")
public class InterviewController {

    private final InterviewAgent interviewAgent;
    private final SseEmitterHandler sseHandler;

    public InterviewController(InterviewAgent interviewAgent, SseEmitterHandler sseHandler) {
        this.interviewAgent = interviewAgent;
        this.sseHandler = sseHandler;
    }

    // ---------- 手冲 (Pour-over) ----------

    @PostMapping("/pour-over")
    public ApiResponse<String> startPourOver(@Valid @RequestBody StartInterviewRequest request,
                                             @RequestAttribute(value = "userId", required = false) String userId) {
        String sessionId = UUID.randomUUID().toString();
        sseHandler.registerSession(sessionId, resolveUserId(userId), request);
        return ApiResponse.success(sessionId);
    }

    // ---------- 美式 (Americano) ----------

    @PostMapping("/americano")
    public ApiResponse<String> startAmericano(@Valid @RequestBody StartInterviewRequest request,
                                              @RequestAttribute(value = "userId", required = false) String userId) {
        String sessionId = UUID.randomUUID().toString();
        sseHandler.registerSession(sessionId, resolveUserId(userId), request);
        return ApiResponse.success(sessionId);
    }

    // ---------- 拿铁 (Latte) ----------

    @PostMapping("/latte")
    public ApiResponse<String> startLatte(@Valid @RequestBody StartInterviewRequest request,
                                          @RequestAttribute(value = "userId", required = false) String userId) {
        String sessionId = UUID.randomUUID().toString();
        sseHandler.registerSession(sessionId, resolveUserId(userId), request);
        return ApiResponse.success(sessionId);
    }

    // ---------- 当季特调 (Special) ----------

    @PostMapping("/special")
    public ApiResponse<String> startSpecial(@Valid @RequestBody StartInterviewRequest request,
                                            @RequestAttribute(value = "userId", required = false) String userId) {
        String sessionId = UUID.randomUUID().toString();
        sseHandler.registerSession(sessionId, resolveUserId(userId), request);
        return ApiResponse.success(sessionId);
    }

    // ---------- SSE stream ----------

    @GetMapping(value = "/stream/{sessionId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> stream(@PathVariable("sessionId") String sessionId) {
        return sseHandler.getSessionStream(sessionId);
    }

    // ---------- Submit answer ----------

    @PostMapping("/answer")
    public ApiResponse<String> answer(@Valid @RequestBody UserAnswerRequest request) {
        sseHandler.submitAnswer(request);
        return ApiResponse.success("ok");
    }

    // ---------- End session & generate report ----------

    @PostMapping("/{sessionId}/end")
    public ApiResponse<String> endSession(@PathVariable("sessionId") String sessionId) {
        sseHandler.endSession(sessionId);
        return ApiResponse.success("ok");
    }

    // ---------- Cancel session (discard without report) ----------

    @PostMapping("/{sessionId}/cancel")
    public ApiResponse<String> cancelSession(@PathVariable("sessionId") String sessionId) {
        sseHandler.cancelSession(sessionId);
        return ApiResponse.success("ok");
    }

    private String resolveUserId(String userId) {
        return userId == null || userId.isBlank() ? "anonymous" : userId;
    }
}
