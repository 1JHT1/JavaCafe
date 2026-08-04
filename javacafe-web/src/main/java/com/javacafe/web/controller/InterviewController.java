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
 * REST controller for interview sessions.
 * Routes map to the coffee-menu naming convention from the architecture:
 *   - /api/interview/pour-over  → 手冲 (project deep dive)
 *   - /api/interview/americano  → 美式 (system design)
 *   - /api/interview/latte      → 拿铁 (Java fundamentals)
 *   - /api/interview/special    → 当季特调 (mixed mock)
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
    public ApiResponse<String> startPourOver(@Valid @RequestBody StartInterviewRequest request) {
        String sessionId = UUID.randomUUID().toString();
        String userId = getCurrentUserId();
        sseHandler.registerSession(sessionId, userId, request);
        return ApiResponse.success(sessionId);
    }

    // ---------- 美式 (Americano) ----------

    @PostMapping("/americano")
    public ApiResponse<String> startAmericano(@Valid @RequestBody StartInterviewRequest request) {
        String sessionId = UUID.randomUUID().toString();
        String userId = getCurrentUserId();
        sseHandler.registerSession(sessionId, userId, request);
        return ApiResponse.success(sessionId);
    }

    // ---------- 拿铁 (Latte) ----------

    @PostMapping("/latte")
    public ApiResponse<String> startLatte(@Valid @RequestBody StartInterviewRequest request) {
        String sessionId = UUID.randomUUID().toString();
        String userId = getCurrentUserId();
        sseHandler.registerSession(sessionId, userId, request);
        return ApiResponse.success(sessionId);
    }

    // ---------- 当季特调 (Special) ----------

    @PostMapping("/special")
    public ApiResponse<String> startSpecial(@Valid @RequestBody StartInterviewRequest request) {
        String sessionId = UUID.randomUUID().toString();
        String userId = getCurrentUserId();
        sseHandler.registerSession(sessionId, userId, request);
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

    private String getCurrentUserId() {
        // Placeholder — real implementation reads from JWT security context
        return "anonymous";
    }
}
