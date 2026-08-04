package com.javacafe.core.workflow;

import com.javacafe.infra.memory.MemoryManager;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Random;

/**
 * "当季特调 (Special)" orchestrator — randomly routes across question types
 * for a realistic full-stack mock interview.
 * Simulates the unpredictable flow of a real interview.
 */
@Component
public class InterviewOrchestrator {

    private static final List<String> QUESTION_TYPES = List.of(
            "Java基础", "JVM", "并发编程", "Spring框架",
            "数据库", "系统设计", "项目经验", "算法思路"
    );

    private final ChatClient chatClient;
    private final MemoryManager memoryManager;
    private final Random random = new Random();

    public InterviewOrchestrator(ChatClient.Builder chatClientBuilder,
                                  MemoryManager memoryManager) {
        this.chatClient = chatClientBuilder.build();
        this.memoryManager = memoryManager;
    }

    public Flux<String> execute(String sessionId, String userId) {
        String memoryContext = memoryManager.getMemoryContext(userId, "综合面试");
        String topic = pickRandomTopic();

        return chatClient.prompt()
                .system("你是JavaCafe的首席咖啡师，正在进行一场综合技术面试。"
                        + "你的风格是随机切换题型，模拟真实大厂面试的不可预测性。\n"
                        + "当前选择的题目类型: " + topic + "\n"
                        + memoryContext)
                .user("开始当季特调综合面试，第一个问题类型: " + topic)
                .stream()
                .content();
    }

    public Flux<String> continueFlow(String sessionId, String userId, String answer) {
        var history = memoryManager.getConversationHistory(sessionId, 50);
        String historyText = history.stream()
                .map(m -> m.role() + ": " + m.content())
                .reduce("", (a, b) -> a + "\n" + b);

        String topic = pickRandomTopic();
        return chatClient.prompt()
                .user("对话历史:\n" + historyText
                        + "\n\n候选人回答: " + answer
                        + "\n\n评估回答后，随机选择下一题类型(" + topic + ")，继续提问。")
                .stream()
                .content();
    }

    private String pickRandomTopic() {
        return QUESTION_TYPES.get(random.nextInt(QUESTION_TYPES.size()));
    }
}
