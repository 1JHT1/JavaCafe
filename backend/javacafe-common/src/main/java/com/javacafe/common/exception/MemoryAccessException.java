package com.javacafe.common.exception;

public class MemoryAccessException extends RuntimeException {

    public MemoryAccessException(String message) {
        super(message);
    }

    public MemoryAccessException(String message, Throwable cause) {
        super(message, cause);
    }
}
