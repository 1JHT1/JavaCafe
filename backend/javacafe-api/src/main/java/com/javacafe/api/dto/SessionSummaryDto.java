package com.javacafe.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionSummaryDto {

    /** 会话 ID（= 前端 SSE 的 sessionId，同时是 InterviewSessionEntity.id） */
    private String sessionId;
    /** 咖啡模式名（InterviewMode 枚举名：LATTE / AMERICANO / POUR_OVER / SPECIAL） */
    private String mode;
    private LocalDateTime createdAt;
    private int totalRounds;
    private int score;
    /** 报告摘要，从 reportJson 宽松提取，缺失时为空串 */
    private String summary;
    /** 优势亮点（供历史页能力雷达图聚合），报告不可解析时为空列表 */
    private List<CupNoteReport.StrengthPoint> strengths;
    /** 薄弱环节（供历史页能力雷达图聚合），报告不可解析时为空列表 */
    private List<CupNoteReport.WeaknessPoint> weaknesses;
    /** 改进建议，报告不可解析时为空列表 */
    private List<String> suggestions;
}
