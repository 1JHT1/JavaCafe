package com.javacafe.core.tools;

import com.javacafe.infra.memory.LongTermMemory;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * RAG-based vector retrieval tool for Java fundamentals (八股文) mode.
 * Retrieves historically relevant interview Q&A from pgvector to provide
 * personalized question selection and avoid repeating mastered topics.
 */
@Component
public class VectorRetrievalTool {

    private final LongTermMemory longTermMemory;

    public VectorRetrievalTool(LongTermMemory longTermMemory) {
        this.longTermMemory = longTermMemory;
    }

    /**
     * Retrieve relevant historical context for the current question.
     */
    public String retrieve(String userId, String currentQuestion) {
        return longTermMemory.buildMemoryContext(userId, currentQuestion);
    }

    /**
     * Retrieve similar past Q&A records for RAG.
     */
    public List<String> retrieveSimilarRecords(String query, int topK) {
        return longTermMemory.retrieveRelevantHistory(query, topK);
    }
}
