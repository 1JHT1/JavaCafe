package com.javacafe.infra.memory;

import com.javacafe.common.constant.BusinessConstants;
import com.javacafe.common.exception.MemoryAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * 基于 Redis 的短期记忆，用于当前面试会话。
 * 维护最近对话消息的滑动窗口。
 */
@Component
public class ShortTermMemory {

    private static final String KEY_PREFIX = "javacafe:session:";
    private static final Duration TTL = Duration.ofMinutes(30);

    private final StringRedisTemplate redisTemplate;

    public ShortTermMemory(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void appendMessage(String sessionId, String role, String content) {
        try {
            String key = KEY_PREFIX + sessionId;
            String entry = role + ":::" + content;
            redisTemplate.opsForList().rightPush(key, entry);

            // 裁剪至最大窗口大小
            Long size = redisTemplate.opsForList().size(key);
            if (size != null && size > BusinessConstants.MAX_SHORT_TERM_MESSAGES) {
                redisTemplate.opsForList().trim(key, size - BusinessConstants.MAX_SHORT_TERM_MESSAGES, -1);
            }
            redisTemplate.expire(key, TTL);
        } catch (Exception e) {
            throw new MemoryAccessException("Failed to append short-term message", e);
        }
    }

    public List<Message> getRecentMessages(String sessionId, int limit) {
        try {
            String key = KEY_PREFIX + sessionId;
            Long size = redisTemplate.opsForList().size(key);
            if (size == null || size == 0) {
                return List.of();
            }
            long start = Math.max(0, size - limit);
            List<String> raw = redisTemplate.opsForList().range(key, start, -1);
            if (raw == null) return List.of();

            List<Message> messages = new ArrayList<>();
            for (String entry : raw) {
                String[] parts = entry.split(":::", 2);
                if (parts.length == 2) {
                    messages.add(new Message(parts[0], parts[1]));
                }
            }
            return messages;
        } catch (Exception e) {
            throw new MemoryAccessException("Failed to retrieve short-term messages", e);
        }
    }

    public void clearSession(String sessionId) {
        redisTemplate.delete(KEY_PREFIX + sessionId);
    }

    public record Message(String role, String content) {}
}
