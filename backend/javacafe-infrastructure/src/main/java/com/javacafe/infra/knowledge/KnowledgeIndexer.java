package com.javacafe.infra.knowledge;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

/**
 * 启动时扫描知识库目录（knowledge.base-path），将 Markdown / 文本文件索引到 pgvector。
 * 目录不存在或为空时跳过，不阻塞应用启动。
 */
@Component
public class KnowledgeIndexer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeIndexer.class);

    private final KnowledgeBaseService knowledgeBaseService;
    private final KnowledgeConfig config;

    public KnowledgeIndexer(KnowledgeBaseService knowledgeBaseService, KnowledgeConfig config) {
        this.knowledgeBaseService = knowledgeBaseService;
        this.config = config;
    }

    @Override
    public void run(ApplicationArguments args) {
        Path dir = Path.of(config.getBasePath());
        if (!Files.isDirectory(dir)) {
            log.warn("Knowledge base directory not found: {} (skip indexing)", dir);
            return;
        }
        try (Stream<Path> stream = Files.walk(dir)) {
            List<Path> files = stream
                    .filter(Files::isRegularFile)
                    .filter(p -> isKnowledgeFile(p.getFileName().toString()))
                    .sorted(Comparator.comparing(Path::toString))
                    .toList();
            if (files.isEmpty()) {
                log.info("Knowledge base directory is empty: {} (skip indexing)", dir);
                return;
            }
            int chunks = knowledgeBaseService.reindex(files);
            log.info("Knowledge base indexed: {} files, {} chunks", files.size(), chunks);
        } catch (IOException e) {
            log.error("Failed to scan knowledge base directory: {}", dir, e);
        }
    }

    private boolean isKnowledgeFile(String name) {
        String lower = name.toLowerCase();
        return lower.endsWith(".md") || lower.endsWith(".txt");
    }
}
