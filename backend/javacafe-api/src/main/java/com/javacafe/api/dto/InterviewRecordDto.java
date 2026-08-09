package com.javacafe.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 单轮面试问答记录（对应 InterviewRecordEntity），按轮次升序返回。
 * 供历史报告页"查看对话记录"弹窗使用。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewRecordDto {

    private String sessionId;
    /** 面试主题（如 JVM、并发），可能为空 */
    private String topic;
    /** 轮次序号（从 0 开始，展示时前端 +1） */
    private int roundNumber;
    /** 面试官题目 */
    private String question;
    /** 用户回答 */
    private String answer;
    /** 咖啡师评估 */
    private String evaluation;
    private LocalDateTime createdAt;
}
