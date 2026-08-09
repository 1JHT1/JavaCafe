package com.javacafe.web.controller;

import com.javacafe.api.dto.ApiResponse;
import com.javacafe.api.dto.CupNoteReport;
import com.javacafe.api.dto.InterviewRecordDto;
import com.javacafe.api.dto.SessionSummaryDto;
import com.javacafe.common.exception.InterviewException;
import com.javacafe.common.util.JsonUtils;
import com.javacafe.infra.entity.InterviewRecordEntity;
import com.javacafe.infra.entity.InterviewSessionEntity;
import com.javacafe.infra.repository.InterviewRecordRepository;
import com.javacafe.infra.repository.InterviewSessionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * 历史记录 / 报告查询接口（P1-3）——
 * GET /api/interview/history：按 userId 倒序返回会话摘要列表；
 * GET /api/interview/report/{sessionId}：返回会话原始报告 JSON 文本（前端 normalizeReport 降级解析，与 SSE 流一致）；
 * GET /api/interview/history/{sessionId}/download：下载会话杯测报告（Markdown 附件，前端触发浏览器保存）；
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

    /**
     * 下载会话杯测报告：从数据库读取报告原文，排版为 Markdown 附件返回（不落盘文件）。
     * 先按 userId 校验归属，防止越权下载他人面试内容。
     */
    @GetMapping("/history/{sessionId}/download")
    public Mono<ResponseEntity<byte[]>> downloadReport(
            @PathVariable("sessionId") String sessionId,
            @RequestAttribute(value = "userId", required = false) String userId) {
        return Mono.fromCallable(() -> {
            String uid = userId == null || userId.isBlank() ? "anonymous" : userId;
            InterviewSessionEntity entity = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> new InterviewException("SESSION_NOT_FOUND", "会话不存在"));
            if (!uid.equals(entity.getUserId())) {
                throw new InterviewException("FORBIDDEN", "无权下载该会话");
            }
            String reportJson = entity.getReportJson();
            if (reportJson == null || reportJson.isBlank()) {
                throw new InterviewException("REPORT_NOT_FOUND", "该会话暂无杯测报告");
            }
            String filename = "javacafe-report-" + sessionId.replaceAll("[^a-zA-Z0-9_-]", "").substring(0, Math.min(12, sessionId.length())) + ".md";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("text/markdown;charset=UTF-8"));
            headers.setContentDisposition(
                    ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build());
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(buildMarkdown(entity, reportJson).getBytes(StandardCharsets.UTF_8));
        }).subscribeOn(Schedulers.boundedElastic());
    }

    /**
     * 把报告排版为 Markdown：头部元信息 + 结构化字段（summary / strengths / weaknesses / suggestions）；
     * 非严格 JSON（LLM 自由文本）时原样保留全文，最后附完整报告原文保证信息无损。
     */
    private String buildMarkdown(InterviewSessionEntity entity, String reportJson) {
        StringBuilder sb = new StringBuilder();
        sb.append("# JavaCafe 杯测报告\n\n");
        sb.append("- 咖啡：").append(modeLabel(entity.getMode())).append("面试\n");
        sb.append("- 时间：").append(entity.getCreatedAt()).append("\n");
        sb.append("- 轮数：").append(entity.getTotalRounds()).append("\n");
        sb.append("- 得分：").append(entity.getScore()).append(" / 100\n");
        sb.append("- 会话：").append(entity.getId()).append("\n\n---\n\n");

        JsonNode report = tryParse(reportJson);
        if (report != null && report.has("summary")) {
            sb.append("## 总结\n\n").append(report.get("summary").asText()).append("\n\n");
            appendPointList(sb, "## 亮点", report.get("strengths"),
                    (n) -> "- **" + n.path("topic").asText("") + "**：" + n.path("comment").asText("") + "\n");
            appendPointList(sb, "## 待改进", report.get("weaknesses"),
                    (n) -> "- **" + n.path("topic").asText("") + "**：" + n.path("comment").asText("")
                            + (n.hasNonNull("suggestion") ? "（建议：" + n.get("suggestion").asText() + "）" : "") + "\n");
            if (report.has("suggestions") && report.get("suggestions").isArray()) {
                sb.append("## 建议\n\n");
                report.get("suggestions").forEach(n -> sb.append("- ").append(n.asText("")).append("\n"));
                sb.append("\n");
            }
        } else {
            sb.append("## 杯测报告\n\n").append(reportJson).append("\n\n");
        }
        sb.append("---\n\n").append("## 完整报告原文\n\n```json\n").append(reportJson).append("\n```\n");
        return sb.toString();
    }

    /** 辅助拼接结构化点列表（strengths / weaknesses 等 JsonNode 数组） */
    private void appendPointList(StringBuilder sb, String title, JsonNode array,
                                 java.util.function.Function<JsonNode, String> line) {
        if (array == null || !array.isArray() || array.isEmpty()) return;
        sb.append(title).append("\n\n");
        array.forEach(n -> sb.append(line.apply(n)));
        sb.append("\n");
    }

    /** 面试模式枚举 → 中文菜单名（与前端 reportModeLabel 一致） */
    private String modeLabel(String mode) {
        return switch (mode) {
            case "POUR_OVER" -> "手冲";
            case "AMERICANO" -> "美式";
            case "LATTE" -> "拿铁";
            case "SPECIAL" -> "当季特调";
            default -> mode;
        };
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
                .strengths(toStrengthPoints(report))
                .weaknesses(toWeaknessPoints(report))
                .suggestions(toStringList(report, "suggestions"))
                .build();
    }

    /** 解析报告 strengths 数组（{topic, comment}），供历史页能力雷达图聚合 */
    private List<CupNoteReport.StrengthPoint> toStrengthPoints(JsonNode report) {
        if (report == null || !report.has("strengths") || !report.get("strengths").isArray()) {
            return List.of();
        }
        List<CupNoteReport.StrengthPoint> points = new ArrayList<>();
        report.get("strengths").forEach(n -> points.add(CupNoteReport.StrengthPoint.builder()
                .topic(n.path("topic").asText(""))
                .comment(n.path("comment").asText(""))
                .build()));
        return points;
    }

    /** 解析报告 weaknesses 数组（{topic, comment, suggestion}），供历史页能力雷达图聚合 */
    private List<CupNoteReport.WeaknessPoint> toWeaknessPoints(JsonNode report) {
        if (report == null || !report.has("weaknesses") || !report.get("weaknesses").isArray()) {
            return List.of();
        }
        List<CupNoteReport.WeaknessPoint> points = new ArrayList<>();
        report.get("weaknesses").forEach(n -> points.add(CupNoteReport.WeaknessPoint.builder()
                .topic(n.path("topic").asText(""))
                .comment(n.path("comment").asText(""))
                .suggestion(n.path("suggestion").asText(""))
                .build()));
        return points;
    }

    /** 解析报告字符串数组（如 suggestions） */
    private List<String> toStringList(JsonNode report, String field) {
        if (report == null || !report.has(field) || !report.get(field).isArray()) {
            return List.of();
        }
        List<String> items = new ArrayList<>();
        report.get(field).forEach(n -> {
            String text = n.asText("");
            if (!text.isBlank()) items.add(text);
        });
        return items;
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
