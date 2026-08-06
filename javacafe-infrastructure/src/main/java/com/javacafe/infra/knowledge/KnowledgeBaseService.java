package com.javacafe.infra.knowledge;

import com.javacafe.common.exception.MemoryAccessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 预置知识库：将外部知识文档（八股文、技术资料等）切分、向量化后存入 pgvector，
 * 通过 metadata 的 source 标记与用户面试记忆相互隔离，供拿铁模式 RAG 检索。
 */
@Component
public class KnowledgeBaseService {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeBaseService.class);

    private final VectorStore vectorStore;
    private final JdbcTemplate jdbcTemplate;
    private final KnowledgeConfig config;
    private final TokenTextSplitter textSplitter;

    public KnowledgeBaseService(VectorStore vectorStore,
                                JdbcTemplate jdbcTemplate,
                                KnowledgeConfig config) {
        this.vectorStore = vectorStore;
        this.jdbcTemplate = jdbcTemplate;
        this.config = config;
        this.textSplitter = new TokenTextSplitter();
    }

    /**
     * 重建知识库索引：先清空旧的知识向量，再对给定文档切分并入库。
     * 返回入库的分块总数。
     */
    public int reindex(List<Path> files) {
        try {
            clearKnowledgeVectors();
            int totalChunks = 0;
            for (Path file : files) {
                String content = Files.readString(file, StandardCharsets.UTF_8);
                if (content.isBlank()) {
                    continue;
                }
                String docKey = file.getFileName().toString();
                // 切分后各分块自动继承源文档的 metadata（source / docKey 标记）
                Document doc = new Document(content,
                        Map.of("source", config.getSourceTag(), "docKey", docKey));
                List<Document> docs = textSplitter.split(doc);
                vectorStore.add(docs);
                totalChunks += docs.size();
                log.info("Knowledge indexed: {} ({} chunks)", docKey, docs.size());
            }
            return totalChunks;
        } catch (Exception e) {
            throw new MemoryAccessException("Failed to index knowledge base", e);
        }
    }

    /**
     * 检索与查询最相关的知识分块，返回拼装好的文本上下文（空结果返回空串）。
     * 仅命中知识库文档（source 标记），不会混入用户面试记忆。
     */
    public String retrieve(String query, int topK) {
        try {
            List<Document> results = vectorStore.similaritySearch(SearchRequest.builder()
                    .query(query)
                    .topK(topK)
                    .filterExpression("source == '" + config.getSourceTag() + "'")
                    .build());
            if (results.isEmpty()) {
                log.info("Knowledge retrieval: query=\"{}\", hits=0", query);
                return "";
            }
            // 记录命中块数及来源文档，便于确认知识库是否生效
            String docKeys = results.stream()
                    .map(d -> String.valueOf(d.getMetadata().get("docKey")))
                    .distinct()
                    .collect(Collectors.joining(", "));
            log.info("Knowledge retrieval: query=\"{}\", hits={}, docs=[{}]",
                    query, results.size(), docKeys);
            StringBuilder sb = new StringBuilder();
            sb.append("【外部知识参考】\n");
            for (int i = 0; i < results.size(); i++) {
                sb.append("  ").append(i + 1).append(". ")
                        .append(results.get(i).getContent()).append("\n");
            }
            return sb.toString();
        } catch (Exception e) {
            throw new MemoryAccessException("Failed to retrieve knowledge context", e);
        }
    }

    /**
     * 删除所有已入库的知识向量（按 source 标记过滤），供重建索引使用。
     */
    private void clearKnowledgeVectors() {
        jdbcTemplate.update(
                "DELETE FROM " + config.getTableName() + " WHERE metadata->>'source' = ?",
                config.getSourceTag());
        log.info("Knowledge vectors cleared from table {}", config.getTableName());
    }
}
