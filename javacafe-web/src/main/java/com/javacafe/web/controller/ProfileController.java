package com.javacafe.web.controller;

import com.javacafe.api.dto.ApiResponse;
import com.javacafe.api.dto.UserProfileDto;
import com.javacafe.common.exception.InterviewException;
import com.javacafe.common.util.JsonUtils;
import com.javacafe.infra.entity.UserEntity;
import com.javacafe.infra.repository.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/**
 * 用户画像接口（P1-1）—— GET/PUT /api/user/profile。
 * 画像存入 users.profileJson（UserProfileDto 字段 JSON），面试前由 UserProfileService 注入 prompt。
 * UserRepository 为阻塞 JPA，调用放到 boundedElastic 线程，避免阻塞事件循环。
 */
@RestController
@RequestMapping("/api/user")
public class ProfileController {

    private final UserRepository userRepository;

    public ProfileController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/profile")
    public Mono<ApiResponse<UserProfileDto>> getProfile(
            @RequestAttribute(value = "userId", required = false) String userId) {
        return Mono.fromCallable(() -> {
            String uid = resolve(userId);
            if ("anonymous".equals(uid)) {
                return ApiResponse.success(defaultProfile(uid));
            }
            return ApiResponse.success(userRepository.findById(uid)
                    .map(this::toProfileDto)
                    .orElseGet(() -> defaultProfile(uid)));
        }).subscribeOn(Schedulers.boundedElastic());
    }

    @PutMapping("/profile")
    public Mono<ApiResponse<UserProfileDto>> updateProfile(
            @RequestAttribute(value = "userId", required = false) String userId,
            @RequestBody UserProfileDto request) {
        return Mono.fromCallable(() -> {
            String uid = resolve(userId);
            if ("anonymous".equals(uid)) {
                throw new InterviewException("UNAUTHORIZED", "请先登录后再保存画像");
            }
            UserEntity user = userRepository.findById(uid)
                    .orElseThrow(() -> new InterviewException("USER_NOT_FOUND", "用户不存在"));
            user.setDisplayName(request.getDisplayName());
            user.setProfileJson(JsonUtils.toJson(request));
            return ApiResponse.success(toProfileDto(userRepository.save(user)));
        }).subscribeOn(Schedulers.boundedElastic());
    }

    private UserProfileDto toProfileDto(UserEntity user) {
        if (user.getProfileJson() != null && !user.getProfileJson().isBlank()) {
            UserProfileDto dto = JsonUtils.fromJson(user.getProfileJson(), UserProfileDto.class);
            dto.setUserId(user.getId());
            return dto;
        }
        return UserProfileDto.builder()
                .userId(user.getId())
                .displayName(user.getDisplayName() == null ? "咖啡学员" : user.getDisplayName())
                .build();
    }

    private UserProfileDto defaultProfile(String uid) {
        return UserProfileDto.builder().userId(uid).displayName("咖啡学员").build();
    }

    private String resolve(String userId) {
        return userId == null || userId.isBlank() ? "anonymous" : userId;
    }
}
