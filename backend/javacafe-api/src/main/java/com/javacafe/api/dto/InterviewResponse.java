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
    private String role;       // 角色："interviewer" | "user"
    private String content;
    private String eventType;  // 事件类型：question | message | report | complete | error
    private int roundNumber;
}
