package com.javacafe.infra.knowledge;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 预置知识库配置。
 * 知识源为 data/knowledge 目录下的 Markdown / 文本文件，
 * 启动时自动切分并向量化入库，供拿铁（八股文）模式 RAG 检索。
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "knowledge")
public class KnowledgeConfig {

    /** 知识源目录 */
    private String basePath = "./data/knowledge";

    /** 检索时返回的知识分块数量 */
    private int topK = 5;

    /** pgvector 向量表名（与 spring.ai.vectorstore.pgvector 默认一致） */
    private String tableName = "vector_store";

    /** 知识库文档的元数据标记，用于与用户面试记忆隔离 */
    private String sourceTag = "knowledge";
}
