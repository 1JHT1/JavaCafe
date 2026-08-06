package com.javacafe.core.tools;

import com.javacafe.common.exception.ResumeParseException;
import com.javacafe.infra.config.StorageConfig;
import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * 将上传的简历文件（PDF、Word、TXT）解析为纯文本，供 LLM 分析。
 * 主要用于"手冲"项目深挖工作流。
 */
@Component
public class ResumeParsingTool {

    private final Tika tika = new Tika();
    private final StorageConfig storageConfig;

    public ResumeParsingTool(StorageConfig storageConfig) {
        this.storageConfig = storageConfig;
    }

    /**
     * 解析简历文件并返回其纯文本内容。
     * 文件按账号隔离：{basePath}/{resumeDir}/{userId}/{resumeId}。
     */
    public String parse(String userId, String resumeId) {
        String uid = userId == null || userId.isBlank() ? "anonymous" : userId;
        Path resumePath = Path.of(storageConfig.getBasePath(),
                storageConfig.getResumeDir(), uid, resumeId);
        if (!Files.exists(resumePath)) {
            throw new ResumeParseException("Resume file not found: " + resumeId);
        }
        try (InputStream is = Files.newInputStream(resumePath)) {
            return tika.parseToString(is);
        } catch (IOException | TikaException e) {
            throw new ResumeParseException("Failed to parse resume: " + resumeId, e);
        }
    }

    /**
     * 从简历文本中提取关键信息，供面试官使用。
     */
    public String extractKeyInfo(String resumeText) {
        StringBuilder sb = new StringBuilder();
        sb.append("【候选人简历核心信息】\n");
        sb.append(resumeText);

        // 保留完整简历文本——由 LLM 在上下文中自行提取关键信息
        if (resumeText.length() > 4000) {
            return resumeText.substring(0, 4000) + "\n...(简历内容已截断)";
        }
        return resumeText;
    }
}
