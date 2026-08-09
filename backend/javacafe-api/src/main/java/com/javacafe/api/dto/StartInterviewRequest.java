package com.javacafe.api.dto;

import com.javacafe.common.constant.BusinessConstants.InterviewMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StartInterviewRequest {

    @NotNull
    private InterviewMode mode;

    private String resumeId;
}
