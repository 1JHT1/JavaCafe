package com.javacafe.infra.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "interview_sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewSessionEntity {

    // 主键直接复用前端会话 UUID（SseEmitterHandler.persistSession 显式写入），
    // 保证历史接口返回的 sessionId 与前端会话一致，前端 fetchHistory 合并去重才生效；
    // 不再使用数据库自动生成（自动生成的 UUID 与前端不同，导致同一场面试出现两份记录）。
    @Id
    private String id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String mode;

    @Column(columnDefinition = "TEXT")
    private String transcriptJson;

    @Column(columnDefinition = "TEXT")
    private String reportJson;

    private int totalRounds;
    private int score;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
