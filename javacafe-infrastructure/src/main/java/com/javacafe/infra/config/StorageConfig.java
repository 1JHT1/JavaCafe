package com.javacafe.infra.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "storage.local")
public class StorageConfig {

    private String basePath = "./data";
    private String resumeDir = "resumes";
    private String reportDir = "reports";
}
