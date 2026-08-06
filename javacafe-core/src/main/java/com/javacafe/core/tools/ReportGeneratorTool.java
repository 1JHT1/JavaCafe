package com.javacafe.core.tools;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

/**
 * 生成"杯测笔记"面试报告。
 * 汇总优势、薄弱点以及可执行的改进建议。
 */
@Component
public class ReportGeneratorTool {

    private static final String REPORT_PROMPT = """
        你是JavaCafe的"首席咖啡师"面试官。请基于以下面试对话记录，生成一份"杯测笔记"面试报告。

        必须严格按以下 JSON 结构返回，字段名与嵌套层级不可更改，不要输出 Markdown 代码块或其他任何文字：
        {
          "score": 0-100 的整数，总体评分,
          "summary": "一段总体评价（1-2 句话）",
          "strengths": [{"topic": "优势点标题", "comment": "具体说明"}],
          "weaknesses": [{"topic": "薄弱点标题", "comment": "具体说明", "suggestion": "改进建议"}],
          "suggestions": ["下一步行动建议1", "建议2", "建议3"]
        }

        要求：score 为 0-100 整数；strengths 列 3-5 个；weaknesses 列 3-5 个且每个附改进建议；
        suggestions 列 3 条具体行动建议。
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
