package com.javacafe.api.contract;

import com.javacafe.api.dto.StartInterviewRequest;
import com.javacafe.api.dto.UserAnswerRequest;
import reactor.core.publisher.Flux;

/**
 * Contract interface for the interview session controller.
 * Web layer implements this; core layer depends on this contract.
 */
public interface InterviewSessionContract {

    Flux<String> startInterview(StartInterviewRequest request);

    Flux<String> submitAnswer(UserAnswerRequest request);

    Flux<String> getSessionStream(String sessionId);
}
