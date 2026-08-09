package com.javacafe.api.contract;

import com.javacafe.api.dto.StartInterviewRequest;
import com.javacafe.api.dto.UserAnswerRequest;
import reactor.core.publisher.Flux;
/*
* 已经实现，这里保留只是展示项目结构作用
* */
/**
 * 面试会话控制器的契约接口。
 * Web 层实现该接口，core 层依赖此契约。
 */
public interface InterviewSessionContract {

    Flux<String> startInterview(StartInterviewRequest request);

    Flux<String> submitAnswer(UserAnswerRequest request);

    Flux<String> getSessionStream(String sessionId);
}
