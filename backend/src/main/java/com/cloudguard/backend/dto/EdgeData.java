package com.cloudguard.backend.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Represents a directed edge connecting two canvas nodes.
 * Mirrors the frontend PipelineEdgeDTO shape.
 */
public record EdgeData(
        String id,
        @NotBlank String source,
        @NotBlank String target
) {}
