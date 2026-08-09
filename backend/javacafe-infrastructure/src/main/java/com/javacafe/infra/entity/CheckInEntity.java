package com.javacafe.infra.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 打卡记录（每日一杯）—— 按 (userId, checkInDate) 唯一，防重复打卡。
 * checkInDate 存 yyyy-MM-dd 字符串，与前端今日 key 格式一致。
 */
@Entity
@Table(name = "check_ins", uniqueConstraints = @UniqueConstraint(name = "uk_checkin_user_date", columnNames = {"user_id", "check_in_date"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "check_in_date", nullable = false, length = 10)
    private String checkInDate;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
