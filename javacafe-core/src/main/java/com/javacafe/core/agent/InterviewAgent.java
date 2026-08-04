package com.javacafe.core.agent;

import com.javacafe.api.dto.StartInterviewRequest;
import com.javacafe.common.constant.BusinessConstants.InterviewMode;
import com.javacafe.core.tools.ReportGeneratorTool;
import com.javacafe.core.tools.ResumeParsingTool;
import com.javacafe.core.tools.SystemDesignEvaluator;
import com.javacafe.core.tools.VectorRetrievalTool;
import com.javacafe.core.workflow.DeepDiveWorkflow;
import com.javacafe.core.workflow.InterviewOrchestrator;
import com.javacafe.infra.memory.MemoryManager;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

import java.util.List;

/**
 * Main interview agent — dispatches to the appropriate workflow based on the
 * selected coffee-menu mode.
 */
@Component
public class InterviewAgent {

    private final ChatClient chatClient;
    private final MemoryManager memoryManager;
    private final ResumeParsingTool resumeParsingTool;
    private final VectorRetrievalTool vectorRetrievalTool;
    private final SystemDesignEvaluator systemDesignEvaluator;
    private final ReportGeneratorTool reportGeneratorTool;
    private final DeepDiveWorkflow deepDiveWorkflow;
    private final InterviewOrchestrator interviewOrchestrator;

    public InterviewAgent(ChatClient.Builder chatClientBuilder,
                          MemoryManager memoryManager,
                          ResumeParsingTool resumeParsingTool,
                          VectorRetrievalTool vectorRetrievalTool,
                          SystemDesignEvaluator systemDesignEvaluator,
                          ReportGeneratorTool reportGeneratorTool,
                          DeepDiveWorkflow deepDiveWorkflow,
                          InterviewOrchestrator interviewOrchestrator) {
        this.chatClient = chatClientBuilder.build();
        this.memoryManager = memoryManager;
        this.resumeParsingTool = resumeParsingTool;
        this.vectorRetrievalTool = vectorRetrievalTool;
        this.systemDesignEvaluator = systemDesignEvaluator;
        this.reportGeneratorTool = reportGeneratorTool;
        this.deepDiveWorkflow = deepDiveWorkflow;
        this.interviewOrchestrator = interviewOrchestrator;
    }

    /**
     * Start a new interview session and return a Flux of SSE event strings.
     */
    public Flux<String> startSession(String sessionId, String userId, StartInterviewRequest request) {
        return switch (request.getMode()) {
            case LATTE -> runLatte(sessionId, userId);
            case POUR_OVER -> deepDiveWorkflow.execute(sessionId, userId, request.getResumeId());
            case AMERICANO -> runAmericano(sessionId, userId);
            case SPECIAL -> interviewOrchestrator.execute(sessionId, userId);
        };
    }

    /**
     * Process a user's answer and continue the interview flow.
     */
    public Flux<String> processAnswer(String sessionId, String userId, String answer, InterviewMode mode) {
        // Record the user's answer in short-term memory
        memoryManager.recordExchange(sessionId, "", answer);

        return switch (mode) {
            case LATTE -> continueLatte(sessionId, userId, answer);
            case POUR_OVER -> deepDiveWorkflow.continueFlow(sessionId, userId, answer);
            case AMERICANO -> continueAmericano(sessionId, userId, answer);
            case SPECIAL -> interviewOrchestrator.continueFlow(sessionId, userId, answer);
        };
    }

    // ---------- Latte (八股文 / Java fundamentals) ----------

    private Flux<String> runLatte(String sessionId, String userId) {
        String memoryContext = memoryManager.getMemoryContext(userId, "Java基础知识");
        String systemPrompt = PromptLoader.load("prompts/LattePrompt.txt")
                .replace("{memory_context}", memoryContext);

        return chatClient.prompt()
                .messages(new SystemMessage(systemPrompt),
                          new UserMessage("开始面试，请提出第一个Java基础问题。"))
                .stream()
                .content();
    }

    private Flux<String> continueLatte(String sessionId, String userId, String answer) {
        var history = memoryManager.getConversationHistory(sessionId,
                com.javacafe.common.constant.BusinessConstants.MAX_SHORT_TERM_MESSAGES);

        String historyText = history.stream()
                .map(m -> m.role() + ": " + m.content())
                .reduce("", (a, b) -> a + "\n" + b);

        return chatClient.prompt()
                .user("对话历史:\n" + historyText + "\n\n用户的回答: " + answer
                        + "\n\n请评估用户回答并继续提出下一个问题。")
                .stream()
                .content();
    }

    // ---------- Americano (系统设计 / System design) ----------

    private Flux<String> runAmericano(String sessionId, String userId) {
        String memoryContext = memoryManager.getMemoryContext(userId, "系统设计");
        String systemPrompt = PromptLoader.load("prompts/AmericanoPrompt.txt")
                .replace("{memory_context}", memoryContext);

        return chatClient.prompt()
                .messages(new SystemMessage(systemPrompt),
                          new UserMessage("开始系统设计面试，请提出第一个架构设计问题。"))
                .stream()
                .content();
    }

    private Flux<String> continueAmericano(String sessionId, String userId, String answer) {
        var history = memoryManager.getConversationHistory(sessionId,
                com.javacafe.common.constant.BusinessConstants.MAX_SHORT_TERM_MESSAGES);

        String historyText = history.stream()
                .map(m -> m.role() + ": " + m.content())
                .reduce("", (a, b) -> a + "\n" + b);

        return chatClient.prompt()
                .user("对话历史:\n" + historyText
                        + "\n\n用户的系统设计回答: " + answer
                        + "\n\n请评估用户的架构设计思路，并继续深入追问。")
                .stream()
                .content();
    }

    // ---------- Report generation ----------

    public Flux<String> generateReport(String sessionId, String userId) {
        var history = memoryManager.getConversationHistory(sessionId,
                com.javacafe.common.constant.BusinessConstants.MAX_SHORT_TERM_MESSAGES);

        String transcript = history.stream()
                .map(m -> m.role() + ": " + m.content())
                .reduce("", (a, b) -> a + "\n" + b);

        return chatClient.prompt()
                .user("以下是一场面试的完整记录，请生成一份杯测笔记（面试报告），"
                        + "包含：总体评分(1-100)、优点列表、弱点列表和改进建议。\n\n" + transcript)
                .stream()
                .content();
    }
}
