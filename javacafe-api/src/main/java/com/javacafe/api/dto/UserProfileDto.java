package com.javacafe.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDto {

    private String userId;
    private String displayName;
    private String targetPosition;
    private String experienceLevel;
    private String strengths;
    private String weaknesses;
}
