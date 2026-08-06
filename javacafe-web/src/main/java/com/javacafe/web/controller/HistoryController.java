package com.javacafe.web.controller;

import com.javacafe.api.dto.ApiResponse;
import com.javacafe.api.dto.InterviewRecordDto;
import com.javacafe.api.dto.SessionSummaryDto;
import com.javacafe.common.exception.InterviewException;
import com.javacafe.common.util.JsonUtils;
import com.javacafe.infra.entity.InterviewRecordEntity;
import com.javacafe.infra.entity.InterviewSessionEntity;
import com.javacafe.infra.repository.InterviewRecordRepository;
import com.javacafe.infra.repository.InterviewSessionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;

/**
 * 历史记录 / 报告查询接口（P1-3）——
 * GET /api/interview/history：按 userId 倒序返回会话摘要列表；
 * GET /api/interview/report/{sessionId}：返回会话原始报告 JSON 文本（前端 normalizeReport 降级解析，与 SSE 流一致）；
 * DELETE /api/interview/history/{sessionId}：删除单条会话（校验归属，防止越权）。
 * 数据由 SseEmitterHandler 在报告生成完成后落库（interview_sessions 表）。
 */
@RestController
@RequestMapping("/api/interview")
public class HistoryController {

    private final InterviewSessionRepository sessionRepository;
    private final InterviewRecordRepository recordRepository;

    public HistoryController(InterviewSessionRepository sessionRepository,
                             InterviewRecordRepository recordRepository) {
        this.sessionRepository = sessionRepository;
        this.recordRepository = recordRepository;
    }

    @GetMapping("/history")
    public Mono<ApiResponse<List<SessionSummaryDto>>> history(
            @RequestAttribute(value = "userId", required = false) String userId) {
        return Mono.fromCallable(() -> {
            String uid = userId == null || userId.isBlank() ? "anonymous" : userId;
            List<SessionSummaryDto> summaries = sessionRepository
                    .findByUserIdOrderByCreatedAtDesc(uid).stream()
                    .map(this::toSummary)
                    .toList();
            return ApiResponse.success(summaries);
        }).subscribeOn(Schedulers.boundedElastic());
    }

    @GetMapping("/report/{sessionId}")
    public Mono<ApiResponse<String>> report(
            @PathVariable("sessionId") String sessionId,
            @RequestAttribute(value = "userId", required = false) String userId) {
        return Mono.fromCallable(() -> {
            String uid = userId == null || userId.isBlank() ? "anonymous" : userId;
            InterviewSessionEntity entity = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> new InterviewException("SESSION_NOT_FOUND", "会话不存在"));
            if (!uid.equals(entity.getUserId())) {
                throw new InterviewException("FORBIDDEN", "无权查看该会话");
            }
            if (entity.getReportJson() == null || entity.getReportJson().isBlank()) {
                throw new InterviewException("REPORT_NOT_FOUND", "该会话暂无杯测报告");
            }
            return ApiResponse.success(entity.getReportJson());
        }).subscribeOn(Schedulers.boundedElastic());
    }

    /**
     * 删除单条历史会话：先按 userId 校验归属，防止越权删除他人记录。
     * 前端删除成功后同步清理本地 localStorage 缓存，避免刷新后复活。
     */
    @DeleteMapping("/history/{sessionId}")
    public Mono<ApiResponse<Void>> deleteHistory(
            @PathVariable("sessionId") String sessionId,
            @RequestAttribute(value = "userId", required = false) String userId) {
        return Mono.fromCallable(() -> {
            String uid = userId == null || userId.isBlank() ? "anonymous" : userId;
            InterviewSessionEntity entity = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> new InterviewException("SESSION_NOT_FOUND", "会话不存在"));
            if (!uid.equals(entity.getUserId())) {
                throw new InterviewException("FORBIDDEN", "无权删除该会话");
            }
            sessionRepository.delete(entity);
            return ApiResponse.<Void>success(null);
        }).subscribeOn(Schedulers.boundedElastic());
    }

    /**
     * 查询某次会话的完整对话记录（题目 / 回答 / 评估，按轮次升序）。
     * 先按 userId 校验归属，防止越权查看他人面试内容。
     */
    @GetMapping("/history/{sessionId}/records")
    public Mono<ApiResponse<List<InterviewRecordDto>>> records(
            @PathVariable("sessionId") String sessionId,
            @RequestAttribute(value = "userId", required = false) String userId) {
        return Mono.fromCallable(() -> {
            String uid = userId == null || userId.isBlank() ? "anonymous" : userId;
            InterviewSessionEntity entity = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> new InterviewException("SESSION_NOT_FOUND", "会话不存在"));
            if (!uid.equals(entity.getUserId())) {
                throw new InterviewException("FORBIDDEN", "无权查看该会话");
            }
            List<InterviewRecordDto> records = recordRepository
                    .findBySessionIdOrderByRoundNumberAsc(sessionId).stream()
                    .map(this::toRecordDto)
                    .toList();
            return ApiResponse.success(records);
        }).subscribeOn(Schedulers.boundedElastic());
    }

    private InterviewRecordDto toRecordDto(InterviewRecordEntity entity) {
        return InterviewRecordDto.builder()
                .sessionId(entity.getSessionId())
                .topic(entity.getTopic())
                .roundNumber(entity.getRoundNumber())
                .question(entity.getQuestion())
                .answer(entity.getAnswer())
                .evaluation(entity.getEvaluation())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private SessionSummaryDto toSummary(InterviewSessionEntity entity) {
        JsonNode report = tryParse(entity.getReportJson());
        return SessionSummaryDto.builder()
                .sessionId(entity.getId())
                .mode(entity.getMode())
                .createdAt(entity.getCreatedAt())
                .totalRounds(entity.getTotalRounds())
                .score(entity.getScore() > 0 ? entity.getScore() : fieldAsInt(report, "score"))
                .summary(fieldAsText(report, "summary"))
                .build();
    }

    private JsonNode tryParse(String reportJson) {
        if (reportJson == null || reportJson.isBlank()) return null;
        try {
            return JsonUtils.fromJson(reportJson, JsonNode.class);
        } catch (Exception e) {
            return null;
        }
    }

    private int fieldAsInt(JsonNode node, String field) {
        return node != null && node.has(field) ? node.get(field).asInt() : 0;
    }

    private String fieldAsText(JsonNode node, String field) {
        return node != null && node.has(field) ? node.get(field).asText() : "";
    }
}
