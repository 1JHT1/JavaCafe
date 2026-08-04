package com.javacafe.core.agent;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Loads externalized prompt templates from the classpath.
 */
public final class PromptLoader {

    private PromptLoader() {}

    public static String load(String path) {
        try (InputStream is = PromptLoader.class.getClassLoader().getResourceAsStream(path)) {
            if (is == null) {
                throw new IllegalStateException("Prompt file not found: " + path);
            }
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load prompt: " + path, e);
        }
    }
}
