package com.javacafe.core.service;

import com.javacafe.api.dto.UserProfileDto;
import com.javacafe.common.util.JsonUtils;
import com.javacafe.infra.entity.UserEntity;
import com.javacafe.infra.repository.UserRepository;
import org.springframework.stereotype.Component;

/**
 * 用户画像服务（P1-1）—— 将 users.profileJson 解析为可注入面试 prompt 的画像文本。
 * 游客（anonymous）返回占位说明；未设置画像时回退为 displayName。
 */
@Component
public class UserProfileService {

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
}
