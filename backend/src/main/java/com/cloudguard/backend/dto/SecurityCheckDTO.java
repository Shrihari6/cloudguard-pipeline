package com.cloudguard.backend.dto;

/**
 * Represents the result of a single deterministic security rule check.
 * Used inside NodeMetricsDTO for per-layer pass/fail status.
 */
public record SecurityCheckDTO(
        String ruleId,
        String title,
        boolean isPassed,
        String description
) {}
