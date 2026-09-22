package com.cloudguard.backend.dto;

/**
 * Per-node security state with 3-layer breakdown.
 * Layer 1 — Identity (IAM): has an edge to/from an IAM Role node.
 * Layer 2 — Encryption (KMS): storage/stream node connected to a KMS Key node.
 * Layer 3 — Observability (CloudWatch): compute/database node connected to CloudWatch.
 *
 * Score is 0–100 based on how many applicable layers pass.
 * Security provider nodes (iam, kms, cloudwatch, guardduty, waf) are exempt from
 * the layers they provide and receive PASS by default for those layers.
 */
public record NodeMetricsDTO(
        String nodeId,
        String nodeType,
        int score,                         // 0–100 for this node
        SecurityCheckDTO layer1Identity,   // IAM connectivity check
        SecurityCheckDTO layer2Encryption, // KMS connectivity check
        SecurityCheckDTO layer3Logging     // CloudWatch connectivity check
) {}
