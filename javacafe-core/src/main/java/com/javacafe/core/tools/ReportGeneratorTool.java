package com.javacafe.core.tools;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

/**
 * Generates the "杯测笔记 (Cup Note)" interview report.
 * Summarizes strengths, weaknesses, and actionable improvement suggestions.
 */
@Component
public class ReportGeneratorTool {

    private static final String REPORT_PROMPT = """
        你是JavaCafe的"首席咖啡师"面试官。请基于以下面试对话记录，生成一份"杯测笔记"面试报告。
        报告应包含：
        1. 总体评分 (1-100)
        2. 优势领域 (列出3-5个)
        3. 薄弱领域 (列出3-5个，每个附上改进建议)
        4. 综合建议 (3条具体的下一步行动建议)
        5. 一句温暖的鼓励语

        请以JSON格式返回报告，字段名使用英文。
        """;

    private final ChatClient chatClient;

    public ReportGeneratorTool(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    public String generate(String transcript) {
        return chatClient.prompt()
                .system(REPORT_PROMPT)
                .user(transcript)
                .call()
                .content();
    }
}
