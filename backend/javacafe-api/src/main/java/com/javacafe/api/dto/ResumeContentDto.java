package com.javacafe.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeContentDto {

    /** resumeId（= 文件名） */
    private String id;
    private String fileName;
    /** 文件纯文本内容，供前端回显预览 */
    private String content;
}
