package com.javacafe.web.controller;

import com.javacafe.api.dto.ApiResponse;
import com.javacafe.common.exception.InterviewException;
import com.javacafe.infra.entity.CheckInEntity;
import com.javacafe.infra.repository.CheckInRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 打卡记录接口（每日一杯）——
 * GET /api/checkin/dates：返回当前用户全部打卡日期（升序）；
 * POST /api/checkin/dates：批量写入打卡日期（按 (userId, date) 去重幂等），返回合并后的全部日期。
 * 打卡数据按 userId 隔离，登录用户在任意浏览器/设备登录后均可拉取同步（P1-2 云端同步）。
 */
@RestController
@RequestMapping("/api/checkin")
public class CheckInController {

    private final CheckInRepository checkInRepository;

    public CheckInController(CheckInRepository checkInRepository) {
        this.checkInRepository = checkInRepository;
    }

    @GetMapping("/dates")
    public Mono<ApiResponse<List<String>>> getDates(
            @RequestAttribute(value = "userId", required = false) String userId) {
        return Mono.fromCallable(() -> {
            String uid = resolve(userId);
            if ("anonymous".equals(uid)) {
                return ApiResponse.success(List.<String>of());
            }
            return ApiResponse.success(listDates(uid));
        }).subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping("/dates")
    public Mono<ApiResponse<List<String>>> saveDates(
            @RequestAttribute(value = "userId", required = false) String userId,
            @RequestBody List<String> dates) {
        return Mono.fromCallable(() -> {
            String uid = resolve(userId);
            if ("anonymous".equals(uid)) {
                throw new InterviewException("UNAUTHORIZED", "请先登录后再同步打卡记录");
            }
            Set<String> valid = dates.stream()
                    .filter(d -> d != null && d.matches("\\d{4}-\\d{2}-\\d{2}"))
                    .collect(Collectors.toSet());
            if (!valid.isEmpty()) {
                Set<String> existing = checkInRepository
                        .findByUserIdAndCheckInDateIn(uid, valid).stream()
                        .map(CheckInEntity::getCheckInDate)
                        .collect(Collectors.toSet());
                valid.stream()
                        .filter(d -> !existing.contains(d))
                        .map(d -> CheckInEntity.builder().userId(uid).checkInDate(d).build())
                        .forEach(checkInRepository::save);
            }
            return ApiResponse.success(listDates(uid));
        }).subscribeOn(Schedulers.boundedElastic());
    }

    private List<String> listDates(String uid) {
        return checkInRepository.findByUserIdOrderByCheckInDateAsc(uid).stream()
                .map(CheckInEntity::getCheckInDate)
                .toList();
    }

    private String resolve(String userId) {
        return userId == null || userId.isBlank() ? "anonymous" : userId;
    }
}
