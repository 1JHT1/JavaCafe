package com.javacafe.infra.memory;

import com.javacafe.common.exception.MemoryAccessException;
import com.javacafe.infra.entity.InterviewRecordEntity;
import com.javacafe.infra.repository.InterviewRecordRepository;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 基于 pgvector 的长期记忆，用于跨会话个性化。
 * 支持：
 * 1. 用户画像（实体记忆）——以结构化数据存储
 * 2. 历史经验（向量记忆）——存储在 pgvector 中供 RAG 检索
 */
@Component
public class LongTermMemory {

    private final VectorStore vectorStore;
    private final InterviewRecordRepository recordRepository;

    public LongTermMemory(VectorStore vectorStore, InterviewRecordRepository recordRepository) {
        this.vectorStore = vectorStore;
        this.recordRepository = recordRepository;
    }

    /**
     * 将一条面试问答记录以向量嵌入形式持久化，供后续检索。
     */
    public void storeInterviewRecord(String userId, String sessionId,
                                      String question, String answer,
                                      String evaluation, String topic) {
        try {
            String content = "Q: " + question + "\nA: " + answer + "\nEvaluation: " + evaluation;
            Document doc = new Document(content,
                    Map.of("userId", userId, "sessionId", sessionId, "topic", topic));
            vectorStore.add(List.of(doc));

            // 同步落库关系表：供 buildMemoryContext 直接查询，并补全历史记录持久化
            int roundNumber = recordRepository.findBySessionIdOrderByRoundNumberAsc(sessionId).size();
            recordRepository.save(InterviewRecordEntity.builder()
                    .sessionId(sessionId)
                    .userId(userId)
                    .question(question)
                    .answer(answer)
                    .evaluation(evaluation)
                    .topic(topic)
                    .roundNumber(roundNumber)
                    .build());
        } catch (Exception e) {
            throw new MemoryAccessException("Failed to store interview record", e);
        }
    }

    /**
     * 检索与当前问题上下文最相关的 Top-K 条历史记录。
     * 按 userId 过滤，保持每位候选人的记忆相互隔离。
     */
    public List<String> retrieveRelevantHistory(String userId, String query, int topK) {
        try {
            SearchRequest.Builder searchRequest = SearchRequest.builder()
                    .query(query)
                    .topK(topK);
            // 仅当 userId 存在时按用户过滤向量检索，避免跨用户记忆串扰
            if (userId != null && !userId.isBlank()) {
                searchRequest.filterExpression("userId == '" + userId + "'");
            }
            List<Document> results = vectorStore.similaritySearch(searchRequest.build());
            return results.stream()
                    .map(Document::getContent)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            throw new MemoryAccessException("Failed to retrieve historical records", e);
        }
    }

    /**
     * 根据用户过往的面试记录构建文本记忆上下文。
     */
    public String buildMemoryContext(String userId, String currentQuestion) {
        List<InterviewRecordEntity> pastRecords = recordRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (pastRecords.isEmpty()) {
            return "";
        }

        List<String> relevant = retrieveRelevantHistory(userId, currentQuestion,
                com.javacafe.common.constant.BusinessConstants.DEFAULT_TOP_K_RETRIEVAL);

        StringBuilder sb = new StringBuilder();
        sb.append("【历史面试记忆】\n");
        if (!relevant.isEmpty()) {
            sb.append("与该问题相关的历史记录：\n");
            for (int i = 0; i < relevant.size(); i++) {
                sb.append("  ").append(i + 1).append(". ").append(relevant.get(i)).append("\n");
            }
        }
        return sb.toString();
    }
}
