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
 * pgvector-based long-term memory for cross-session personalization.
 * Supports:
 * 1. User profile (entity memory) — stored as structured data
 * 2. Historical experience (vector memory) — stored in pgvector for RAG retrieval
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
     * Persist an interview Q&A record as a vector embedding for future retrieval.
     */
    public void storeInterviewRecord(String userId, String sessionId,
                                      String question, String answer,
                                      String evaluation, String topic) {
        try {
            String content = "Q: " + question + "\nA: " + answer + "\nEvaluation: " + evaluation;
            Document doc = new Document(content,
                    Map.of("userId", userId, "sessionId", sessionId, "topic", topic));
            vectorStore.add(List.of(doc));
        } catch (Exception e) {
            throw new MemoryAccessException("Failed to store interview record in vector store", e);
        }
    }

    /**
     * Retrieve top-K historically relevant records for the current question context.
     */
    public List<String> retrieveRelevantHistory(String query, int topK) {
        try {
            SearchRequest searchRequest = SearchRequest.builder()
                    .query(query)
                    .topK(topK)
                    .build();
            List<Document> results = vectorStore.similaritySearch(searchRequest);
            return results.stream()
                    .map(Document::getContent)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            throw new MemoryAccessException("Failed to retrieve historical records", e);
        }
    }

    /**
     * Build a textual memory context from the user's past interview records.
     */
    public String buildMemoryContext(String userId, String currentQuestion) {
        List<InterviewRecordEntity> pastRecords = recordRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (pastRecords.isEmpty()) {
            return "";
        }

        List<String> relevant = retrieveRelevantHistory(currentQuestion,
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
