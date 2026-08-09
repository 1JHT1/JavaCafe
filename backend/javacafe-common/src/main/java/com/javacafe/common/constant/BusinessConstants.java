package com.javacafe.common.constant;

public final class BusinessConstants {

    private BusinessConstants() {}

    public static final String CAFE_NAME = "JavaCafe";
    public static final String AI_PERSONA = "首席咖啡师";

    /** 面试模式 —— 对应咖啡菜单 */
    public enum InterviewMode {
        POUR_OVER,    // 手冲 — 项目深挖
        AMERICANO,    // 美式 — 系统设计
        LATTE,        // 拿铁 — 各类八股文
        SPECIAL       // 当季特调 — 综合模拟面试
    }

    public static final String SSE_EVENT_QUESTION = "question";
    public static final String SSE_EVENT_MESSAGE = "message";
    public static final String SSE_EVENT_REPORT = "report";
    public static final String SSE_EVENT_COMPLETE = "complete";
    public static final String SSE_EVENT_ERROR = "error";

    public static final int MAX_SHORT_TERM_MESSAGES = 50;
    public static final int DEFAULT_TOP_K_RETRIEVAL = 5;
}
