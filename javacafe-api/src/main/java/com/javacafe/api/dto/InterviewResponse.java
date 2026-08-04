package com.javacafe.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewResponse {

    private String sessionId;
    private String role;       // "interviewer" | "user"
    private String content;
    private String eventType;  // question | message | report | complete | error
    private int roundNumber;
}
