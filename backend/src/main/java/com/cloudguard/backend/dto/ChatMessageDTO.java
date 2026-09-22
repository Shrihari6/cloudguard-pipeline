package com.cloudguard.backend.dto;

/**
 * Represents a single message in the chat conversation history.
 */
public record ChatMessageDTO(
        String role,
        String content
) {}
