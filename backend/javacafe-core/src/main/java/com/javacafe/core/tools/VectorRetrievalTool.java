package com.javacafe.core.tools;

import com.javacafe.infra.knowledge.KnowledgeBaseService;
import com.javacafe.infra.memory.LongTermMemory;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 基于 RAG 的向量检索工具，用于拿铁（各类八股文）模式。
 * 支持两类检索来源：
 * 1. 用户历史面试问答（按 userId 隔离），提供个性化选题、避免重复提问；
 * 2. 预置外部知识库（source 标记隔离），为出题与评估提供知识支撑。
 */
@Component
public class VectorRetrievalTool {

    private final LongTermMemory longTermMemory;
    private final KnowledgeBaseService knowledgeBaseService;

    public VectorRetrievalTool(LongTermMemory longTermMemory,
                               KnowledgeBaseService knowledgeBaseService) {
        this.longTermMemory = longTermMemory;
        this.knowledgeBaseService = knowledgeBaseService;
    }

    /**
     * 检索与当前问题相关的历史上下文。
     */
    public String retrieve(String userId, String currentQuestion) {
        return longTermMemory.buildMemoryContext(userId, currentQuestion);
    }

    /**
     * 检索给定用户范围内相似的过往问答记录，用于 RAG。
     */
    public List<String> retrieveSimilarRecords(String userId, String query, int topK) {
        return longTermMemory.retrieveRelevantHistory(userId, query, topK);
    }

    /**
     * 从预置外部知识库检索与查询相关的知识分块，返回拼装好的文本上下文。
     */
    public String retrieveKnowledge(String query, int topK) {
        return knowledgeBaseService.retrieve(query, topK);
    }
}
