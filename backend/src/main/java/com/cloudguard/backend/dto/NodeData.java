package com.cloudguard.backend.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;

/**
 * Represents a single node from the React Flow canvas.
 * Maps React Flow node properties: id, type, label, and optional config.
 */
public record NodeData(
        @NotBlank String id,
        @NotBlank String type,   // lowercase: "s3" | "lambda" | "kinesis" | ...
        String label,
        Map<String, Object> config
) {
    public NodeData(String id, String type, String label) {
        this(id, type, label, null);
    }
}
