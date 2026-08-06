package com.javacafe.web.controller;

import com.javacafe.api.dto.ApiResponse;
import com.javacafe.api.dto.AuthResponse;
import com.javacafe.api.dto.LoginRequest;
import com.javacafe.api.dto.RegisterRequest;
import com.javacafe.common.exception.InterviewException;
import com.javacafe.infra.entity.UserEntity;
import com.javacafe.infra.repository.UserRepository;
import com.javacafe.web.security.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/**
 * 注册 / 登录接口，签发 JWT。
 * UserRepository 为阻塞 JPA，调用放到 boundedElastic 线程，避免阻塞事件循环。
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/register")
    public Mono<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        return Mono.fromCallable(() -> {
            if (userRepository.existsByUsername(request.getUsername())) {
                throw new InterviewException("USERNAME_TAKEN", "用户名已被占用");
            }
            UserEntity user = userRepository.save(UserEntity.builder()
                    .username(request.getUsername())
                    .passwordHash(passwordEncoder.encode(request.getPassword()))
                    .displayName(request.getDisplayName() == null || request.getDisplayName().isBlank()
                            ? request.getUsername() : request.getDisplayName())
                    .build());
            return ApiResponse.success(toAuthResponse(user));
        }).subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/login")
    public Mono<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return Mono.fromCallable(() -> {
            UserEntity user = userRepository.findByUsername(request.getUsername())
                    .orElseThrow(() -> new InterviewException("BAD_CREDENTIALS", "用户名或密码错误"));
            if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
                throw new InterviewException("BAD_CREDENTIALS", "用户名或密码错误");
            }
            return ApiResponse.success(toAuthResponse(user));
        }).subscribeOn(Schedulers.boundedElastic());
    }

    private AuthResponse toAuthResponse(UserEntity user) {
        return AuthResponse.builder()
                .token(JwtUtil.generate(user.getId()))
                .userId(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .build();
    }
}
