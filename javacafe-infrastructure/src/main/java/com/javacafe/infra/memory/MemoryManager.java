package com.javacafe.infra.memory;

import com.javacafe.infra.memory.ShortTermMemory.Message;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 协调短期记忆与长期记忆之间的读写操作。
 * 实现架构中的"读取 → 使用 → 写入"循环。
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

    /**
     * 仅记录用户回答（不产生空的 interviewer 消息），供回答轮次与报告 transcript 使用。
     */
    public void recordUserAnswer(String sessionId, String answer) {
        shortTermMemory.appendMessage(sessionId, "user", answer);
    }

    /**
     * 记录 AI 输出的面试题文本，保证后续轮次能提取到题目内容。
     */
    public void recordInterviewerMessage(String sessionId, String question) {
        shortTermMemory.appendMessage(sessionId, "interviewer", question);
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
