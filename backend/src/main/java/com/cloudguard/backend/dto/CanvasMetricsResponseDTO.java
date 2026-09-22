package com.cloudguard.backend.dto;

import java.util.List;

/**
 * Aggregate metrics response for POST /api/pipeline/validate.
 * Contains global pipeline security posture + per-node breakdown + remediation hints.
 */
public record CanvasMetricsResponseDTO(
        int totalPassedChecks,             // Sum of passed checks across all nodes
        int totalPossibleChecks,           // Sum of possible checks across all nodes
        double overallScorePercentage,     // (passed / possible) * 100, rounded to 1 decimal
        List<NodeMetricsDTO> nodeMetricsList,
        List<String> suggestedRemediations // Human-readable actions to improve score
) {}
