package com.cloudguard.backend.engine;

import com.cloudguard.backend.dto.*;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * DeterministicRuleEngine — pure graph topology analysis.
 * NO LLM calls. NO external I/O. Results are fully deterministic from the graph structure.
 *
 * Security layers checked per node:
 *   Layer 1 — Identity      : Node has an edge to/from an IAM Role node
 *   Layer 2 — Encryption    : Storage/stream node has edge to/from a KMS Key node
 *   Layer 3 — Observability : Compute/database node has edge to/from a CloudWatch node
 *
 * Security provider nodes (iam, kms, cloudwatch, guardduty, waf) are treated as
 * "pass by default" for the layers they provide — they don't need to connect to themselves.
 */
@Service
public class DeterministicRuleEngine {

    // Node types that require IAM connection (Layer 1) — excludes pure security providers
    private static final Set<String> IAM_REQUIRED_TYPES = Set.of(
            "kinesis", "s3", "sqs", "sns", "eventbridge",
            "lambda", "glue", "emr", "ec2", "ecs", "eks",
            "rds", "dynamodb", "redshift", "apigateway"
    );

    // Node types that require KMS connection (Layer 2) — storage and streaming
    private static final Set<String> ENCRYPTION_REQUIRED_TYPES = Set.of(
            "kinesis", "s3", "sqs", "sns", "ec2",
            "rds", "dynamodb", "redshift"
    );

    // Node types that require CloudWatch connection (Layer 3) — compute and databases
    private static final Set<String> LOGGING_REQUIRED_TYPES = Set.of(
            "lambda", "glue", "emr", "ec2", "ecs", "eks",
            "rds", "dynamodb", "redshift", "kinesis", "apigateway"
    );

    // Pure security/observability provider nodes — evaluated leniently
    private static final Set<String> SECURITY_PROVIDER_TYPES = Set.of(
            "iam", "kms", "waf", "cloudwatch", "guardduty",
            "vpc", "cloudfront"
    );

    /**
     * Runs the full 3-layer security check against the provided graph topology.
     *
     * @param graph incoming CanvasGraphDTO with nodes and edges
     * @return CanvasMetricsResponseDTO with scores, per-node breakdowns, and remediation hints
     */
    public CanvasMetricsResponseDTO evaluate(CanvasGraphDTO graph) {
        return evaluateGraphMetrics(graph);
    }

    public CanvasMetricsResponseDTO evaluateGraphMetrics(CanvasGraphDTO graph) {
        List<NodeData> nodes = graph.nodes();
        List<EdgeData> edges = graph.edges();

        // Build adjacency sets: nodeId → set of connected nodeIds (bidirectional)
        Map<String, Set<String>> adjacency = buildAdjacency(nodes, edges);

        // Build nodeId → nodeType lookup
        Map<String, String> nodeTypes = nodes.stream()
                .collect(Collectors.toMap(NodeData::id, nd -> nd.type().toLowerCase()));

        // Build type → nodeIds lookup (for quickly finding "is there a KMS node connected?")
        // We build a type→ids map for connected neighbours
        List<NodeMetricsDTO> nodeMetricsList = new ArrayList<>();
        int totalPassed = 0;
        int totalPossible = 0;
        List<String> remediations = new ArrayList<>();

        for (NodeData node : nodes) {
            String nodeId = node.id();
            String nodeType = node.type().toLowerCase();
            Set<String> neighbours = adjacency.getOrDefault(nodeId, Set.of());

            // Collect the types of all directly connected nodes
            Set<String> neighbourTypes = neighbours.stream()
                    .map(nid -> nodeTypes.getOrDefault(nid, ""))
                    .collect(Collectors.toSet());

            // --- Layer 1: Identity (IAM) ---
            SecurityCheckDTO layer1 = evaluateIamLayer(nodeId, nodeType, neighbourTypes, remediations);

            // --- Layer 2: Encryption (KMS) ---
            SecurityCheckDTO layer2 = evaluateKmsLayer(nodeId, nodeType, neighbourTypes, remediations);

            // --- Layer 3: Observability (CloudWatch) ---
            SecurityCheckDTO layer3 = evaluateCloudWatchLayer(nodeId, nodeType, neighbourTypes, remediations);

            // Count passed / possible for this node based on applicable requirements
            int nodePassed = 0;
            int nodePossible = 0;

            if (!SECURITY_PROVIDER_TYPES.contains(nodeType)) {
                if (IAM_REQUIRED_TYPES.contains(nodeType)) {
                    nodePossible++;
                    if (neighbourTypes.contains("iam")) {
                        nodePassed++;
                    }
                }
                if (ENCRYPTION_REQUIRED_TYPES.contains(nodeType)) {
                    nodePossible++;
                    if (neighbourTypes.contains("kms")) {
                        nodePassed++;
                    }
                }
                if (LOGGING_REQUIRED_TYPES.contains(nodeType)) {
                    nodePossible++;
                    if (neighbourTypes.contains("cloudwatch")) {
                        nodePassed++;
                    }
                }
            }

            totalPassed += nodePassed;
            totalPossible += nodePossible;

            int nodeScore = nodePossible == 0 ? 100 : (int) Math.round((double) nodePassed / nodePossible * 100);

            nodeMetricsList.add(new NodeMetricsDTO(nodeId, nodeType, nodeScore, layer1, layer2, layer3));
        }

        double overallScore = totalPossible == 0 ? 100.0
                : Math.round((double) totalPassed / totalPossible * 1000.0) / 10.0;

        // Deduplicate remediations while preserving insertion order
        List<String> uniqueRemediations = remediations.stream().distinct().collect(Collectors.toList());

        return new CanvasMetricsResponseDTO(
                totalPassed,
                totalPossible,
                overallScore,
                nodeMetricsList,
                uniqueRemediations
        );
    }

    // ─── Private layer evaluators ────────────────────────────────────────────────

    private SecurityCheckDTO evaluateIamLayer(
            String nodeId, String nodeType,
            Set<String> neighbourTypes, List<String> remediations) {

        // Security providers and IAM itself pass by default
        if (SECURITY_PROVIDER_TYPES.contains(nodeType)) {
            return new SecurityCheckDTO(
                    "iam-layer",
                    "IAM Identity Control",
                    true,
                    "Security provider nodes are exempt from IAM connectivity requirement."
            );
        }

        if (!IAM_REQUIRED_TYPES.contains(nodeType)) {
            // Unknown/other node types pass by default (lenient)
            return new SecurityCheckDTO("iam-layer", "IAM Identity Control", true,
                    "Node type does not require IAM connectivity check.");
        }

        boolean hasIam = neighbourTypes.contains("iam");
        if (!hasIam) {
            remediations.add(
                    "CONNECT_NODES: Attach an IAM Role node to [" + nodeType.toUpperCase()
                            + " / " + nodeId + "] to satisfy the Identity layer.");
        }
        return new SecurityCheckDTO(
                "iam-layer",
                "IAM Identity Control",
                hasIam,
                hasIam
                        ? "Node is connected to an IAM Role — identity layer satisfied."
                        : "No IAM Role connected. Least-privilege access control is missing."
        );
    }

    private SecurityCheckDTO evaluateKmsLayer(
            String nodeId, String nodeType,
            Set<String> neighbourTypes, List<String> remediations) {

        // KMS itself and non-storage providers skip this check
        if (SECURITY_PROVIDER_TYPES.contains(nodeType)) {
            return new SecurityCheckDTO(
                    "kms-layer",
                    "Encryption at Rest (KMS)",
                    true,
                    "Security provider nodes are exempt from KMS connectivity requirement."
            );
        }

        if (!ENCRYPTION_REQUIRED_TYPES.contains(nodeType)) {
            // Compute nodes (lambda, glue, emr) don't store data natively — lenient pass
            return new SecurityCheckDTO("kms-layer", "Encryption at Rest (KMS)", true,
                    "Node type does not persist data — encryption check not applicable.");
        }

        boolean hasKms = neighbourTypes.contains("kms");
        if (!hasKms) {
            remediations.add(
                    "CONNECT_NODES: Attach a KMS Key node to [" + nodeType.toUpperCase()
                            + " / " + nodeId + "] to enable encryption at rest.");
        }
        return new SecurityCheckDTO(
                "kms-layer",
                "Encryption at Rest (KMS)",
                hasKms,
                hasKms
                        ? "Node is connected to a KMS Key — encryption layer satisfied."
                        : "No KMS Key connected. Data at rest is unencrypted."
        );
    }

    private SecurityCheckDTO evaluateCloudWatchLayer(
            String nodeId, String nodeType,
            Set<String> neighbourTypes, List<String> remediations) {

        // CloudWatch itself and WAF/GuardDuty are observability providers — pass
        if (SECURITY_PROVIDER_TYPES.contains(nodeType)) {
            return new SecurityCheckDTO(
                    "cw-layer",
                    "Observability (CloudWatch)",
                    true,
                    "Observability provider nodes are exempt from CloudWatch connectivity requirement."
            );
        }

        if (!LOGGING_REQUIRED_TYPES.contains(nodeType)) {
            // S3/SQS pass by default since they log via CloudTrail/S3 access logs
            return new SecurityCheckDTO("cw-layer", "Observability (CloudWatch)", true,
                    "Node type uses CloudTrail-based logging — CloudWatch edge not required.");
        }

        boolean hasCw = neighbourTypes.contains("cloudwatch");
        if (!hasCw) {
            remediations.add(
                    "CONNECT_NODES: Attach a CloudWatch Logs node to [" + nodeType.toUpperCase()
                            + " / " + nodeId + "] to enable observability and threat detection.");
        }
        return new SecurityCheckDTO(
                "cw-layer",
                "Observability (CloudWatch)",
                hasCw,
                hasCw
                        ? "Node is connected to CloudWatch Logs — observability layer satisfied."
                        : "No CloudWatch Logs connected. Execution and error logging is missing."
        );
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Builds a bidirectional adjacency map from the edge list.
     * React Flow edges are directed (source→target), but security connections
     * are meaningful in either direction (e.g., IAM → Lambda or Lambda → IAM).
     */
    private Map<String, Set<String>> buildAdjacency(List<NodeData> nodes, List<EdgeData> edges) {
        Map<String, Set<String>> adj = new HashMap<>();
        // Initialise all nodes with empty sets
        for (NodeData node : nodes) {
            adj.put(node.id(), new HashSet<>());
        }
        // Add bidirectional connections
        for (EdgeData edge : edges) {
            adj.computeIfAbsent(edge.source(), k -> new HashSet<>()).add(edge.target());
            adj.computeIfAbsent(edge.target(), k -> new HashSet<>()).add(edge.source());
        }
        return adj;
    }
}
