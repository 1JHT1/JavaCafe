package com.javacafe.core.workflow;

import com.javacafe.core.agent.PromptLoader;
import com.javacafe.core.tools.ResumeParsingTool;
import com.javacafe.core.tools.VectorRetrievalTool;
import com.javacafe.infra.memory.MemoryManager;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

/**
 * "手冲 (Pour-over)" workflow — project deep-dive interview.
 * Implements a LangGraph-like state machine:
 *   Node A: Ask a question based on resume content
 *   Node B: Evaluate answer depth — if shallow, follow up; if deep, advance
 *   Node C: Summarize the topic and move to the next
 */
@Component
public class DeepDiveWorkflow {

    private final ChatClient chatClient;
    private final MemoryManager memoryManager;
    private final ResumeParsingTool resumeParsingTool;
    private final VectorRetrievalTool vectorRetrievalTool;

    public DeepDiveWorkflow(ChatClient.Builder chatClientBuilder,
                            MemoryManager memoryManager,
                            ResumeParsingTool resumeParsingTool,
                            VectorRetrievalTool vectorRetrievalTool) {
        this.chatClient = chatClientBuilder.build();
        this.memoryManager = memoryManager;
        this.resumeParsingTool = resumeParsingTool;
        this.vectorRetrievalTool = vectorRetrievalTool;
    }

    public Flux<String> execute(String sessionId, String userId, String resumeId) {
        String resumeText = "";
        if (resumeId != null && !resumeId.isBlank()) {
            resumeText = resumeParsingTool.extractKeyInfo(resumeParsingTool.parse(resumeId));
        }

        String memoryContext = memoryManager.getMemoryContext(userId, "项目经验");
        String systemPrompt = PromptLoader.load("prompts/PourOverPrompt.txt")
                .replace("{resume_content}", resumeText)
                .replace("{memory_context}", memoryContext);

        return chatClient.prompt()
                .messages(new SystemMessage(systemPrompt),
                          new UserMessage("请开始项目深挖面试，根据简历内容提出第一个追问。"))
                .stream()
                .content();
    }

    public Flux<String> continueFlow(String sessionId, String userId, String answer) {
        var history = memoryManager.getConversationHistory(sessionId, 50);
        String historyText = history.stream()
                .map(m -> m.role() + ": " + m.content())
                .reduce("", (a, b) -> a + "\n" + b);

        return chatClient.prompt()
                .user("对话历史:\n" + historyText
                        + "\n\n候选人的回答: " + answer
                        + "\n\n判断回答深度：如果肤浅则连环追问同一话题，如果详实则总结当前话题并推进到下一个。")
                .stream()
                .content();
    }
}
