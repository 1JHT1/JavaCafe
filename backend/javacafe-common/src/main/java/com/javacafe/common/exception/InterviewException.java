package com.javacafe.common.exception;

public class InterviewException extends RuntimeException {

    private final String errorCode;

    public InterviewException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public InterviewException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
