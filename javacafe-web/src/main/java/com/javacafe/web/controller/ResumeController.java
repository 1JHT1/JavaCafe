package com.javacafe.web.controller;

import com.javacafe.api.dto.ApiResponse;
import com.javacafe.api.dto.ResumeContentDto;
import com.javacafe.api.dto.ResumeMetaDto;
import com.javacafe.common.exception.InterviewException;
import com.javacafe.infra.config.StorageConfig;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;

/**
 * 简历上传接口（P1-2）—— POST /api/resume/upload + GET /api/resume/{id}。
 * 按账号隔离存储：上传后落盘到 {basePath}/{resumeDir}/{userId}/{resumeId}，
 * resumeId = 清洗后的文件名，与 ResumeParsingTool 读取路径保持一致；
 * GET 用于前端回显纯文本内容，仅能读取本人上传的简历。
 */
@RestController
@RequestMapping("/api/resume")
public class ResumeController {

    private final StorageConfig storageConfig;

    public ResumeController(StorageConfig storageConfig) {
        this.storageConfig = storageConfig;
    }

    @PostMapping("/upload")
    public Mono<ApiResponse<ResumeMetaDto>> upload(@RequestPart("file") FilePart file,
                                                   @RequestAttribute(value = "userId", required = false) String userId) {
        String uid = userId == null || userId.isBlank() ? "anonymous" : userId;
        String safeName = sanitize(file.filename());
        Path dir = Path.of(storageConfig.getBasePath(), storageConfig.getResumeDir(), uid);
        Path target = dir.resolve(safeName);
        return Mono.fromRunnable(() -> {
                    try {
                        Files.createDirectories(dir);
                    } catch (java.io.IOException e) {
                        throw new InterviewException("STORAGE_ERROR", "简历目录创建失败", e);
                    }
                }).subscribeOn(Schedulers.boundedElastic())
                .then(file.transferTo(target))
                .thenReturn(ApiResponse.success(ResumeMetaDto.builder()
                        .id(safeName)
                        .fileName(safeName)
                        .uploadedAt(Instant.now().toString())
                        .build()));
    }

    @GetMapping("/{id}")
    public Mono<ApiResponse<ResumeContentDto>> get(@PathVariable("id") String id,
                                                   @RequestAttribute(value = "userId", required = false) String userId) {
        String uid = userId == null || userId.isBlank() ? "anonymous" : userId;
        return Mono.fromCallable(() -> {
            Path path = Path.of(storageConfig.getBasePath(), storageConfig.getResumeDir(), uid, sanitize(id));
            if (!Files.exists(path)) {
                throw new InterviewException("RESUME_NOT_FOUND", "简历不存在，请重新上传");
            }
            String content = new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
            return ApiResponse.success(ResumeContentDto.builder()
                    .id(id)
                    .fileName(id)
                    .content(content)
                    .build());
        }).subscribeOn(Schedulers.boundedElastic());
    }

    /** 清洗文件名：去掉路径部分与非法字符，防止目录穿越（resumeId 会被 ResumeParsingTool 拼进路径） */
    private String sanitize(String filename) {
        String name = filename == null ? "" : Path.of(filename).getFileName().toString();
        String cleaned = name.replaceAll("[\\\\/:*?\"<>|\\s]", "_");
        if (cleaned.isBlank()) {
            throw new InterviewException("INVALID_FILENAME", "文件名无效");
        }
        return cleaned;
    }
}
