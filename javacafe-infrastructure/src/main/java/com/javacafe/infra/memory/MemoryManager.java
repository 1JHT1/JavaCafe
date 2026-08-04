package com.javacafe.infra.memory;

import com.javacafe.infra.memory.ShortTermMemory.Message;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Coordinates read and write operations across short-term and long-term memory.
 * Implements the "Read → Use → Write" loop from the architecture.
 */
@Component
public class MemoryManager {

    private final ShortTermMemory shortTermMemory;
    private final LongTermMemory longTermMemory;

    public MemoryManager(ShortTermMemory shortTermMemory, LongTermMemory longTermMemory) {
        this.shortTermMemory = shortTermMemory;
        this.longTermMemory = longTermMemory;
    }

    public List<Message> getConversationHistory(String sessionId, int limit) {
        return shortTermMemory.getRecentMessages(sessionId, limit);
    }

    public void recordExchange(String sessionId, String question, String answer) {
        shortTermMemory.appendMessage(sessionId, "interviewer", question);
        shortTermMemory.appendMessage(sessionId, "user", answer);
    }

    public void persistLongTerm(String userId, String sessionId,
                                 String question, String answer,
                                 String evaluation, String topic) {
        longTermMemory.storeInterviewRecord(userId, sessionId, question, answer, evaluation, topic);
    }

    public String getMemoryContext(String userId, String currentQuestion) {
        return longTermMemory.buildMemoryContext(userId, currentQuestion);
    }

    public void endSession(String sessionId) {
        shortTermMemory.clearSession(sessionId);
    }
}
