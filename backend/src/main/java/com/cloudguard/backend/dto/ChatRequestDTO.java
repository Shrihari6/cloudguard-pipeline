package com.cloudguard.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * Request payload for POST /api/pipeline/chat.
 * Contains user query, current canvas graph topology, and optional conversation history.
 */
public record ChatRequestDTO(
        String userMessage,
        @NotNull @Valid CanvasGraphDTO graph,
        List<ChatMessageDTO> history
) {
    public ChatRequestDTO {
        if (history == null) {
            history = List.of();
        }
        if (userMessage == null) {
            userMessage = "";
        }
    }
}
