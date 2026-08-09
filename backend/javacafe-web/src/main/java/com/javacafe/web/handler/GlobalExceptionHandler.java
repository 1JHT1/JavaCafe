package com.javacafe.web.handler;

import com.javacafe.common.exception.InterviewException;
import com.javacafe.common.exception.MemoryAccessException;
import com.javacafe.common.exception.ResumeParseException;
import com.javacafe.web.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ServerWebExchange;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(InterviewException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleInterviewException(InterviewException ex, ServerWebExchange exchange) {
        log.warn("Interview error [{}]: {}", ex.getErrorCode(), ex.getMessage());
        return ErrorResponse.builder()
                .status(400)
                .error(ex.getErrorCode())
                .message(ex.getMessage())
                .path(exchange.getRequest().getPath().value())
                .build();
    }

    @ExceptionHandler(ResumeParseException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleResumeParseException(ResumeParseException ex, ServerWebExchange exchange) {
        log.warn("Resume parse error: {}", ex.getMessage());
        return ErrorResponse.builder()
                .status(400)
                .error("RESUME_PARSE_ERROR")
                .message(ex.getMessage())
                .path(exchange.getRequest().getPath().value())
                .build();
    }

    @ExceptionHandler(MemoryAccessException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleMemoryException(MemoryAccessException ex, ServerWebExchange exchange) {
        log.error("Memory access error: {}", ex.getMessage());
        return ErrorResponse.builder()
                .status(500)
                .error("MEMORY_ERROR")
                .message("记忆系统暂时不可用")
                .path(exchange.getRequest().getPath().value())
                .build();
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleGenericException(Exception ex, ServerWebExchange exchange) {
        log.error("Unexpected error", ex);
        return ErrorResponse.builder()
                .status(500)
                .error("INTERNAL_ERROR")
                .message("服务暂时不可用，请稍后重试")
                .path(exchange.getRequest().getPath().value())
                .build();
    }
}
