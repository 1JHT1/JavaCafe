package com.javacafe.core.agent;

import com.javacafe.api.dto.StartInterviewRequest;
import com.javacafe.common.constant.BusinessConstants.InterviewMode;
import com.javacafe.core.tools.ReportGeneratorTool;
import com.javacafe.core.tools.ResumeParsingTool;
import com.javacafe.core.tools.SystemDesignEvaluator;
import com.javacafe.core.tools.VectorRetrievalTool;
import com.javacafe.core.workflow.DeepDiveWorkflow;
import com.javacafe.core.workflow.InterviewOrchestrator;
import com.javacafe.core.service.UserProfileService;
import com.javacafe.common.util.JsonUtils;
import com.javacafe.infra.memory.MemoryManager;
import com.javacafe.infra.memory.ShortTermMemory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.Map;

/**
 * 主面试智能体——根据所选咖啡菜单模式将请求分发到对应的工作流。
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
    private final UserProfileService userProfileService;

    public InterviewAgent(ChatClient.Builder chatClientBuilder,
                          MemoryManager memoryManager,
                          ResumeParsingTool resumeParsingTool,
                          VectorRetrievalTool vectorRetrievalTool,
                          SystemDesignEvaluator systemDesignEvaluator,
                          ReportGeneratorTool reportGeneratorTool,
                          DeepDiveWorkflow deepDiveWorkflow,
                          InterviewOrchestrator interviewOrchestrator,
                          UserProfileService userProfileService) {
        this.chatClient = chatClientBuilder.build();
        this.memoryManager = memoryManager;
        this.resumeParsingTool = resumeParsingTool;
        this.vectorRetrievalTool = vectorRetrievalTool;
        this.systemDesignEvaluator = systemDesignEvaluator;
        this.reportGeneratorTool = reportGeneratorTool;
        this.deepDiveWorkflow = deepDiveWorkflow;
        this.interviewOrchestrator = interviewOrchestrator;
        this.userProfileService = userProfileService;
    }

    /**
     * 开始一个新的面试会话，返回 SSE 事件字符串流。
     */
    public Flux<String> startSession(String sessionId, String userId, StartInterviewRequest request) {
        Flux<String> flow = switch (request.getMode()) {
            case LATTE -> runLatte(sessionId, userId);
            case POUR_OVER -> deepDiveWorkflow.execute(sessionId, userId, request.getResumeId());
            case AMERICANO -> runAmericano(sessionId, userId);
            case SPECIAL -> interviewOrchestrator.execute(sessionId, userId);
        };

        // 首题文本回写短期记忆（作为 interviewer 消息），
        // 后续轮次提取题目、生成报告 transcript 都需要它。
        StringBuilder firstQuestion = new StringBuilder();
        return flow
                .doOnNext(firstQuestion::append)
                .doOnComplete(() -> {
                    if (!firstQuestion.toString().isBlank()) {
                        memoryManager.recordInterviewerMessage(sessionId, firstQuestion.toString());
                    }
                });
    }

    /**
     * 处理用户的回答并继续面试流程。
     */
    public Flux<String> processAnswer(String sessionId, String userId, String answer, InterviewMode mode) {
        // 先取最近一道面试题（最后一条 interviewer 消息），作为长期记忆的问题字段
        String lastQuestion = lastInterviewerMessage(sessionId);

        // 将用户的回答记录到短期记忆
        memoryManager.recordUserAnswer(sessionId, answer);

        Flux<String> flow = switch (mode) {
            case LATTE -> continueLatte(sessionId, userId, answer);
            case POUR_OVER -> deepDiveWorkflow.continueFlow(sessionId, userId, answer);
            case AMERICANO -> continueAmericano(sessionId, userId, answer);
            case SPECIAL -> interviewOrchestrator.continueFlow(sessionId, userId, answer);
        };

        String topic = topicFor(mode);
        StringBuilder aiReply = new StringBuilder();
        return flow
                .doOnNext(aiReply::append)
                .doOnComplete(() -> {
                    String evaluation = aiReply.toString();
                    if (evaluation.isBlank()) return;
                    // AI 本轮输出（评估+追问）回写短期记忆，保证下一轮能提取到题目文本
                    memoryManager.recordInterviewerMessage(sessionId, evaluation);
                    // 异步持久化长期记忆（向量 + 关系表），避免阻塞 SSE complete 事件
                    Mono.fromRunnable(() -> memoryManager.persistLongTerm(
                                    userId, sessionId, lastQuestion, answer, evaluation, topic))
                            .subscribeOn(Schedulers.boundedElastic())
                            .subscribe();
                });
    }

    /**
     * 将会话全部对话（role + content）导出为 JSON 数组文本，供面试结束落库（interview_sessions.transcriptJson）。
     */
    public String getTranscript(String sessionId) {
        var history = memoryManager.getConversationHistory(sessionId,
                com.javacafe.common.constant.BusinessConstants.MAX_SHORT_TERM_MESSAGES);
        List<Map<String, String>> entries = history.stream()
                .map(m -> Map.of("role", m.role(), "content", m.content()))
                .toList();
        return JsonUtils.toJson(entries);
    }

    // ---------- Latte (各类八股文 RAG) ----------

    private Flux<String> runLatte(String sessionId, String userId) {
        String memoryContext = vectorRetrievalTool.retrieve(userId, "后端开发八股文");
        // 预置外部知识库检索：为出题与评估提供各类八股文知识支撑（无知识库时返回空串）
        String knowledgeContext = vectorRetrievalTool.retrieveKnowledge(
                "后端开发八股文", 8);
        String systemPrompt = PromptLoader.load("prompts/LattePrompt.txt")
                .replace("{memory_context}", memoryContext)
                .replace("{knowledge_context}", knowledgeContext)
                .replace("{user_profile}", userProfileService.buildProfileText(userId));

        return chatClient.prompt()
                .messages(new SystemMessage(systemPrompt),
                          new UserMessage("开始面试，请提出第一个八股文问题（可从 Java 基础、JVM、并发、Spring、MySQL、Redis、计算机网络、操作系统等方向中随机选择）。"))
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
        String memoryContext = vectorRetrievalTool.retrieve(userId, "系统设计");
        String systemPrompt = PromptLoader.load("prompts/AmericanoPrompt.txt")
                .replace("{memory_context}", memoryContext)
                .replace("{user_profile}", userProfileService.buildProfileText(userId));

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

        String lastQuestion = lastInterviewerMessage(sessionId);

        // 系统设计评估是同步阻塞调用，放到 boundedElastic 线程执行，避免阻塞事件循环；
        // 评估结果注入追问 prompt，实现"评估 → 追问"闭环。
        return Mono.fromCallable(() -> systemDesignEvaluator.evaluate(lastQuestion, answer))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMapMany(evaluation -> chatClient.prompt()
                        .user("对话历史:\n" + historyText
                                + "\n\n用户的系统设计回答: " + answer
                                + "\n\n系统设计评估: " + evaluation
                                + "\n\n请结合评估结论，继续深入追问一个更具体的架构问题。")
                        .stream()
                        .content());
    }

    // ---------- Report generation ----------

    public Flux<String> generateReport(String sessionId, String userId) {
        var history = memoryManager.getConversationHistory(sessionId,
                com.javacafe.common.constant.BusinessConstants.MAX_SHORT_TERM_MESSAGES);

        String transcript = history.stream()
                .map(m -> m.role() + ": " + m.content())
                .reduce("", (a, b) -> a + "\n" + b);

        // 报告生成走 ReportGeneratorTool（JSON 结构输出），同步调用放 boundedElastic 线程执行，
        // 一次性返回完整 JSON，前端可直接解析，避免自由文本流式导致解析降级。
        return Mono.fromCallable(() -> reportGeneratorTool.generate(transcript))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMapMany(Flux::just);
    }

    /**
     * 画像学习：将报告中的薄弱点/优势合并回用户画像，供下次面试 prompt 着重考察。
     * 内部自带兜底，失败静默，不影响面试结束主流程。
     */
    public void learnFromReport(String userId, String reportJson) {
        userProfileService.learnFromReport(userId, reportJson);
    }

    // ---------- Helpers ----------

    private String lastInterviewerMessage(String sessionId) {
        return memoryManager.getConversationHistory(sessionId,
                        com.javacafe.common.constant.BusinessConstants.MAX_SHORT_TERM_MESSAGES).stream()
                .filter(m -> "interviewer".equals(m.role()))
                .map(ShortTermMemory.Message::content)
                .reduce((first, second) -> second)
                .orElse("");
    }

    private String topicFor(InterviewMode mode) {
        return switch (mode) {
            case LATTE -> "各类八股文";
            case AMERICANO -> "系统设计";
            case POUR_OVER -> "项目经验";
            case SPECIAL -> "综合面试";
        };
    }
}
