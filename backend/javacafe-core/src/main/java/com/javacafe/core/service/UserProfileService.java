package com.javacafe.core.service;

import com.javacafe.api.dto.UserProfileDto;
import com.javacafe.common.util.JsonUtils;
import com.javacafe.infra.entity.UserEntity;
import com.javacafe.infra.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * 用户画像服务（P1-1）—— 将 users.profileJson 解析为可注入面试 prompt 的画像文本。
 * 游客（anonymous）返回占位说明；未设置画像时回退为 displayName。
 * 同时承担画像学习：面试报告中的薄弱点/优势自动合并回画像（P1-6），
 * 供下次面试 prompt 着重考察。
 */
@Component
public class UserProfileService {

    /** 画像单字段（优势/待提升）最多保留的条目数，防学习内容无限膨胀 */
    private static final int MAX_LEARNED_TOPICS = 8;

    private final UserRepository userRepository;

    public UserProfileService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * 构建画像文本，用于替换各模式 Prompt 中的 {user_profile} 占位符。
     */
    public String buildProfileText(String userId) {
        if (userId == null || userId.isBlank() || "anonymous".equals(userId)) {
            return "（游客，未提供用户画像，按通用情况面试）";
        }
        return userRepository.findById(userId)
                .map(this::formatProfile)
                .orElse("（未找到用户画像，按通用情况面试）");
    }

    private String formatProfile(UserEntity user) {
        UserProfileDto dto;
        if (user.getProfileJson() != null && !user.getProfileJson().isBlank()) {
            dto = JsonUtils.fromJson(user.getProfileJson(), UserProfileDto.class);
        } else {
            dto = UserProfileDto.builder()
                    .displayName(user.getDisplayName() == null ? "咖啡学员" : user.getDisplayName())
                    .build();
        }
        StringBuilder sb = new StringBuilder();
        appendField(sb, "称呼", dto.getDisplayName());
        appendField(sb, "目标岗位", dto.getTargetPosition());
        appendField(sb, "经验水平", dto.getExperienceLevel());
        appendField(sb, "优势", dto.getStrengths());
        appendField(sb, "待提升", dto.getWeaknesses());
        return sb.length() == 0 ? "（未设置画像，按通用情况面试）" : sb.toString();
    }

    private void appendField(StringBuilder sb, String label, String value) {
        if (value != null && !value.isBlank()) {
            if (sb.length() > 0) sb.append('\n');
            sb.append("- ").append(label).append("：").append(value);
        }
    }

    /**
     * 画像学习：从面试杯测报告中提取薄弱点与优势 topic，合并回用户画像。
     * 仅在报告为严格 JSON（可解析出 weaknesses/strengths 数组）时生效；
     * 游客不学习；任何异常静默吞掉，不影响面试结束主流程。
     */
    public void learnFromReport(String userId, String reportJson) {
        if (userId == null || userId.isBlank() || "anonymous".equals(userId)) return;
        if (reportJson == null || reportJson.isBlank()) return;
        try {
            JsonNode report = JsonUtils.fromJson(reportJson, JsonNode.class);
            List<String> weakTopics = extractTopics(report, "weaknesses");
            List<String> strongTopics = extractTopics(report, "strengths");
            if (weakTopics.isEmpty() && strongTopics.isEmpty()) return;

            userRepository.findById(userId).ifPresent(user -> {
                UserProfileDto dto = (user.getProfileJson() != null && !user.getProfileJson().isBlank())
                        ? JsonUtils.fromJson(user.getProfileJson(), UserProfileDto.class)
                        : UserProfileDto.builder().displayName(user.getDisplayName()).build();
                dto.setStrengths(mergeTopics(dto.getStrengths(), strongTopics));
                dto.setWeaknesses(mergeTopics(dto.getWeaknesses(), weakTopics));
                user.setProfileJson(JsonUtils.toJson(dto));
                userRepository.save(user);
            });
        } catch (Exception ignored) {
            // 画像学习是加分项，失败（报告非严格 JSON / 用户不存在等）时静默跳过
        }
    }

    /** 提取报告中某一数组字段的 topic 标题列表（如 weaknesses[].topic） */
    private List<String> extractTopics(JsonNode report, String field) {
        List<String> topics = new ArrayList<>();
        JsonNode arr = report.get(field);
        if (arr == null || !arr.isArray()) return topics;
        arr.forEach(n -> {
            String topic = n.path("topic").asText("").trim();
            if (!topic.isBlank()) topics.add(topic);
        });
        return topics;
    }

    /**
     * 合并学习到的 topic 到画像字段：按行去重（子串互查），追加到已有内容之后；
     * 超上限时优先保留靠前内容（用户手写在前，学习内容在后），避免字段无限膨胀。
     */
    private String mergeTopics(String existing, List<String> newTopics) {
        List<String> lines = new ArrayList<>();
        if (existing != null && !existing.isBlank()) {
            for (String line : existing.split("\\n")) {
                if (!line.isBlank()) lines.add(line.trim());
            }
        }
        for (String topic : newTopics) {
            String t = topic.trim();
            if (t.isEmpty()) continue;
            boolean duplicated = lines.stream().anyMatch(l -> l.contains(t) || t.contains(l));
            if (!duplicated) lines.add(t);
        }
        List<String> kept = lines.size() > MAX_LEARNED_TOPICS
                ? lines.subList(0, MAX_LEARNED_TOPICS)
                : lines;
        return String.join("\n", kept);
    }
}
