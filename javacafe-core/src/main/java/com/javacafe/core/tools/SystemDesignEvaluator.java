package com.javacafe.core.tools;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

/**
 * Evaluates system design answers against established criteria:
 * scalability, reliability, consistency, trade-off awareness.
 * Used by the "美式 (Americano)" system design interview mode.
 */
@Component
public class SystemDesignEvaluator {

    private static final String EVAL_PROMPT = """
        你是一位资深系统架构评审官。请评估以下系统设计方案，按以下维度给出评分(1-10)和评语：
        1. 可扩展性 (Scalability)
        2. 可靠性 (Reliability)
        3. 数据一致性 (Consistency)
        4. 权衡意识 (Trade-off Awareness)
        5. 表达能力 (Clarity)

        最终给出综合评分(1-100)和一句话总结。
        """;

    private final ChatClient chatClient;

    public SystemDesignEvaluator(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    public String evaluate(String question, String answer) {
        return chatClient.prompt()
                .system(EVAL_PROMPT)
                .user("问题: " + question + "\n\n候选人的回答: " + answer)
                .call()
                .content();
    }
}
