package com.cloudguard.backend.dto;

import java.util.List;

/**
 * Response payload for POST /api/pipeline/chat.
 * Contains synthesized natural language response and contextual quick-action suggestions.
 */
public record ChatResponseDTO(
        String message,
        List<String> suggestedActions
) {
    public ChatResponseDTO {
        if (suggestedActions == null) {
            suggestedActions = List.of();
        }
        if (message == null) {
            message = "";
        }
    }
}
