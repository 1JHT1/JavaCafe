package com.javacafe.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeMetaDto {

    /** resumeId（= 保存后的文件名，与 ResumeParsingTool 读取路径一致） */
    private String id;
    private String fileName;
    private String uploadedAt;
}
