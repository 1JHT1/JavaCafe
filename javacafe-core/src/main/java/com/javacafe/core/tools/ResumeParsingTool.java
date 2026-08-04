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
 * Parses uploaded resume files (PDF, Word, TXT) into plain text for LLM analysis.
 * Used primarily by the "手冲 (Pour-over)" project deep-dive workflow.
 */
@Component
public class ResumeParsingTool {

    private final Tika tika = new Tika();
    private final StorageConfig storageConfig;

    public ResumeParsingTool(StorageConfig storageConfig) {
        this.storageConfig = storageConfig;
    }

    /**
     * Parse a resume file and return its plain-text content.
     */
    public String parse(String resumeId) {
        Path resumePath = Path.of(storageConfig.getBasePath(),
                storageConfig.getResumeDir(), resumeId);
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
     * Extract key information from the resume text for the interviewer.
     */
    public String extractKeyInfo(String resumeText) {
        StringBuilder sb = new StringBuilder();
        sb.append("【候选人简历核心信息】\n");
        sb.append(resumeText);

        // Keep full resume text — the LLM handles extraction in-context
        if (resumeText.length() > 4000) {
            return resumeText.substring(0, 4000) + "\n...(简历内容已截断)";
        }
        return resumeText;
    }
}
