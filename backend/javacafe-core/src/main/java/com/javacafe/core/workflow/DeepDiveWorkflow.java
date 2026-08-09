package com.javacafe.core.workflow;

import com.javacafe.core.agent.PromptLoader;
import com.javacafe.core.service.UserProfileService;
import com.javacafe.core.tools.ResumeParsingTool;
import com.javacafe.core.tools.VectorRetrievalTool;
import com.javacafe.infra.memory.MemoryManager;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

/**
 * "手冲"工作流——项目深挖面试。
 * 实现一个类似 LangGraph 的状态机：
 *   节点 A：根据简历内容提问
 *   节点 B：评估回答深度——回答肤浅则继续追问，回答详实则推进
 *   节点 C：总结当前话题并进入下一个
 */
@Component
public class DeepDiveWorkflow {

    private final ChatClient chatClient;
    private final MemoryManager memoryManager;
    private final ResumeParsingTool resumeParsingTool;
    private final VectorRetrievalTool vectorRetrievalTool;
    private final UserProfileService userProfileService;

    public DeepDiveWorkflow(ChatClient.Builder chatClientBuilder,
                            MemoryManager memoryManager,
                            ResumeParsingTool resumeParsingTool,
                            VectorRetrievalTool vectorRetrievalTool,
                            UserProfileService userProfileService) {
        this.chatClient = chatClientBuilder.build();
        this.memoryManager = memoryManager;
        this.resumeParsingTool = resumeParsingTool;
        this.vectorRetrievalTool = vectorRetrievalTool;
        this.userProfileService = userProfileService;
    }

    public Flux<String> execute(String sessionId, String userId, String resumeId) {
        String resumeText = "";
        if (resumeId != null && !resumeId.isBlank()) {
            resumeText = resumeParsingTool.extractKeyInfo(resumeParsingTool.parse(userId, resumeId));
        }

        String memoryContext = vectorRetrievalTool.retrieve(userId, "项目经验");
        String systemPrompt = PromptLoader.load("prompts/PourOverPrompt.txt")
                .replace("{resume_content}", resumeText)
                .replace("{memory_context}", memoryContext)
                .replace("{user_profile}", userProfileService.buildProfileText(userId));

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
