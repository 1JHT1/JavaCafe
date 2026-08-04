package com.javacafe.api.dto;

import com.javacafe.common.constant.BusinessConstants.InterviewMode;
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
public class CupNoteReport {

    private String sessionId;
    private InterviewMode mode;
    private LocalDateTime createdAt;

    private int totalRounds;
    private int score;

    private String summary;
    private List<StrengthPoint> strengths;
    private List<WeaknessPoint> weaknesses;
    private List<String> suggestions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StrengthPoint {
        private String topic;
        private String comment;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeaknessPoint {
        private String topic;
        private String comment;
        private String suggestion;
    }
}
