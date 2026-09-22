package com.cloudguard.backend.service;

import com.cloudguard.backend.dto.CanvasGraphDTO;
import com.cloudguard.backend.dto.NodeMetricsDTO;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Mock implementation of RemediationAgentService.
 * Returns deterministic, human-readable action strings derived purely from
 * failed layer checks — no LLM calls.
 *
 * Replace this bean with a LangChain4j / Groq / Ollama implementation to
 * enable AI-assisted remediation in Phase 6.
 */
@Service
public class MockRemediationAgentService implements RemediationAgentService {

    @Override
    public List<String> suggestRemediations(CanvasGraphDTO graph, List<NodeMetricsDTO> metrics) {
        List<String> suggestions = new ArrayList<>();

        boolean missingIam = false;
        boolean missingKms = false;
        boolean missingCw = false;

        for (NodeMetricsDTO m : metrics) {
            if (!m.layer1Identity().isPassed()) missingIam = true;
            if (!m.layer2Encryption().isPassed()) missingKms = true;
            if (!m.layer3Logging().isPassed()) missingCw = true;
        }

        if (missingIam) {
            suggestions.add("ADD_NODE: Add an IAM Role node and connect it to all data processing services " +
                    "to enforce least-privilege access control (Layer 1 — Identity).");
        }
        if (missingKms) {
            suggestions.add("ADD_NODE: Add a KMS Key node and connect it to all storage and streaming services " +
                    "to enable encryption at rest (Layer 2 — Encryption).");
        }
        if (missingCw) {
            suggestions.add("ADD_NODE: Add a CloudWatch Logs node and connect it to all compute and database " +
                    "services to enable execution logging and anomaly detection (Layer 3 — Observability).");
        }

        long failedNodes = metrics.stream().filter(m -> m.score() < 100).count();
        if (failedNodes > 0) {
            suggestions.add("REVIEW: " + failedNodes + " node(s) have incomplete security coverage. " +
                    "Connecting IAM, KMS, and CloudWatch nodes appropriately will raise your overall score.");
        }

        if (suggestions.isEmpty()) {
            suggestions.add("✅ All security layers satisfied. Pipeline meets baseline CloudGuard security posture.");
        }

        return suggestions;
    }

    @Override
    public com.cloudguard.backend.dto.ChatResponseDTO chatWithCanvasContext(
            String prompt,
            com.cloudguard.backend.dto.CanvasMetricsResponseDTO metrics,
            CanvasGraphDTO graph
    ) {
        // 1. Construct structured system context for the model
        List<String> nodeNames = (graph != null && graph.nodes() != null)
                ? graph.nodes().stream()
                    .map(n -> n.label() != null && !n.label().isBlank() ? n.label() : n.type())
                    .toList()
                : List.of();

        List<String> failedChecks = new ArrayList<>();
        if (metrics != null && metrics.nodeMetricsList() != null) {
            for (NodeMetricsDTO nm : metrics.nodeMetricsList()) {
                if (!nm.layer1Identity().isPassed()) {
                    failedChecks.add(nm.nodeType() + " (" + nm.nodeId() + "): " + nm.layer1Identity().title());
                }
                if (!nm.layer2Encryption().isPassed()) {
                    failedChecks.add(nm.nodeType() + " (" + nm.nodeId() + "): " + nm.layer2Encryption().title());
                }
                if (!nm.layer3Logging().isPassed()) {
                    failedChecks.add(nm.nodeType() + " (" + nm.nodeId() + "): " + nm.layer3Logging().title());
                }
            }
        }

        String failedChecksSummary = failedChecks.isEmpty() ? "None" : String.join(", ", failedChecks);
        int passed = metrics != null ? metrics.totalPassedChecks() : 0;
        int total = metrics != null ? metrics.totalPossibleChecks() : 0;
        double score = metrics != null ? metrics.overallScorePercentage() : 0.0;

        String structuredContext = String.format(
                """
                Active Canvas State:
                Nodes: %s
                Overall Score: %d/%d (%.0f%%)
                Failed Checks: %s
                User Question: "%s"
                """,
                nodeNames,
                passed,
                total,
                score,
                failedChecksSummary,
                prompt != null ? prompt : ""
        );

        // In a production LLM agent (Phase 6), this structured context is dispatched to Gemini / Claude / Ollama.
        // In this high-fidelity mock, we perform context-aware synthesis:
        String lowerPrompt = (prompt != null) ? prompt.toLowerCase().trim() : "";
        StringBuilder reply = new StringBuilder();
        List<String> suggestedActions = new ArrayList<>();

        if (lowerPrompt.contains("validate") || lowerPrompt.contains("system:") || lowerPrompt.contains("breakdown")) {
            reply.append(String.format("🛡️ **Pipeline Security Evaluation Breakdown**\n\n"));
            reply.append(String.format("- **Posture Score**: %d of %d applicable checks passed (%.0f%%)\n", passed, total, score));
            reply.append(String.format("- **Active Canvas Nodes**: %s\n\n", nodeNames.isEmpty() ? "None" : String.join(", ", nodeNames)));

            if (failedChecks.isEmpty()) {
                reply.append("✅ **All Security Layers Satisfied!**\n");
                reply.append("Every node in the active topology is connected to required identity (IAM), encryption (KMS), and observability (CloudWatch) controls.");
                suggestedActions.addAll(List.of(
                        "Explain KMS Key Policy",
                        "Why does Kinesis need an IAM Role connected?",
                        "How do I harden IAM least-privilege?"
                ));
            } else {
                reply.append("⚠️ **Security Deficiencies Detected**:\n");
                for (String fail : failedChecks) {
                    reply.append("• ").append(fail).append("\n");
                }
                reply.append("\n**Remediation Steps**:\n");
                if (metrics != null && !metrics.suggestedRemediations().isEmpty()) {
                    for (String rem : metrics.suggestedRemediations()) {
                        reply.append("• ").append(rem).append("\n");
                    }
                }
                suggestedActions.addAll(List.of(
                        "Why did my score drop?",
                        "How do I fix L2 Encryption?",
                        "Why does Kinesis need an IAM Role connected?"
                ));
            }
        } else if (lowerPrompt.contains("iam") || lowerPrompt.contains("identity") || lowerPrompt.contains("role") || lowerPrompt.contains("least-privilege")) {
            reply.append("🔑 **IAM & Least-Privilege Architecture**\n\n");
            reply.append("In AWS cloud architectures, data ingestion and compute services (such as Kinesis, Lambda, Glue, and RDS) require an attached **IAM Role** (Layer 1 — Identity Control) to avoid hardcoded static credentials.\n\n");
            reply.append("**Key Security Principles**:\n");
            reply.append("1. **AssumeRole Mechanism**: Services assume temporary STS credentials scoped strictly to authorized actions (e.g., `kinesis:PutRecord`, `kinesis:GetRecords`).\n");
            reply.append("2. **Least Privilege**: Grant only permissions required by the immediate consumer or producer.\n");
            reply.append("3. **Auditability**: All API calls performed under the role are logged in AWS CloudTrail for non-repudiation.");
            suggestedActions.addAll(List.of(
                    "Explain KMS Key Policy",
                    "How do I fix L2 Encryption?",
                    "Validate Pipeline"
            ));
        } else if (lowerPrompt.contains("kms") || lowerPrompt.contains("l2") || lowerPrompt.contains("encrypt")) {
            reply.append("🔒 **Layer 2 — KMS Encryption at Rest**\n\n");
            reply.append("Data storage and streaming components (such as Kinesis Data Streams, S3 Buckets, SQS Queues, and DynamoDB) must enforce server-side encryption at rest using AWS KMS (Key Management Service).\n\n");
            reply.append("**How to Satisfy L2 Encryption**:\n");
            reply.append("1. Add a **KMS Key** node to your canvas from the Security palette.\n");
            reply.append("2. Connect an edge from the KMS Key to the target resource (e.g., Kinesis or S3).\n");
            reply.append("3. Configure the KMS Key Policy to delegate cryptographic operations (`kms:GenerateDataKey*`, `kms:Decrypt`) only to authorized IAM execution roles.\n\n");
            reply.append("This fulfills NIST SP 800-53 SC-28 and CIS AWS Benchmark guidelines for protecting sensitive data at rest.");
            suggestedActions.addAll(List.of(
                    "Why does Kinesis need an IAM Role connected?",
                    "Why did my score drop?",
                    "Validate Pipeline"
            ));
        } else if (lowerPrompt.contains("cloudwatch") || lowerPrompt.contains("l3") || lowerPrompt.contains("log") || lowerPrompt.contains("observability")) {
            reply.append("📊 **Layer 3 — Observability & CloudWatch Logging**\n\n");
            reply.append("Compute and database resources (Lambda, Glue, EMR, Kinesis, RDS) must stream operational and security logs to CloudWatch Logs (Layer 3 — Observability).\n\n");
            reply.append("**Security Benefits**:\n");
            reply.append("1. **Real-time Anomaly Detection**: Monitor throttles, unauthorized access attempts, and poison pill records.\n");
            reply.append("2. **Metric Alarms**: Trigger automated alerts when error rates exceed safe thresholds.\n");
            reply.append("3. **Incident Response**: Correlate stream partition lags or database timeouts with CloudTrail audit events.");
            suggestedActions.addAll(List.of(
                    "How do I fix L2 Encryption?",
                    "Why does Kinesis need an IAM Role connected?",
                    "Validate Pipeline"
            ));
        } else if (lowerPrompt.contains("score") || lowerPrompt.contains("drop") || lowerPrompt.contains("fail")) {
            reply.append("📉 **Security Score Analysis**\n\n");
            reply.append(String.format("Your current pipeline posture score is **%d/%d (%.0f%%)**.\n\n", passed, total, score));
            if (failedChecks.isEmpty()) {
                reply.append("Your score is at maximum! All connected services satisfy Layer 1 (IAM), Layer 2 (KMS), and Layer 3 (CloudWatch).");
            } else {
                reply.append("The score dropped because one or more nodes have unfulfilled security dependencies:\n");
                for (String fail : failedChecks) {
                    reply.append("• ").append(fail).append("\n");
                }
                reply.append("\nConnecting security providers (IAM Role, KMS Key, CloudWatch) to these nodes will raise your score to 100%.");
            }
            suggestedActions.addAll(List.of(
                    "How do I fix L2 Encryption?",
                    "Why does Kinesis need an IAM Role connected?",
                    "Explain KMS Key Policy"
            ));
        } else {
            reply.append(String.format("🤖 **Security Copilot Analysis**\n\n"));
            reply.append(String.format("Evaluating your canvas topology with **%d nodes** and **%d/%d passed checks**.\n\n",
                    nodeNames.size(), passed, total));
            reply.append("CloudGuard validates pipelines using a deterministic 3-layer security model:\n");
            reply.append("1. **Layer 1 (Identity)**: Enforces IAM Role attachments for least-privilege execution.\n");
            reply.append("2. **Layer 2 (Encryption)**: Enforces KMS Key encryption at rest for storage & streams.\n");
            reply.append("3. **Layer 3 (Observability)**: Enforces CloudWatch Logs for auditability & telemetry.\n\n");
            reply.append("Ask me any specific question about your pipeline components, compliance rules, or remediation steps!");
            suggestedActions.addAll(List.of(
                    "Validate Pipeline",
                    "Why did my score drop?",
                    "How do I fix L2 Encryption?",
                    "Why does Kinesis need an IAM Role connected?"
            ));
        }

        return new com.cloudguard.backend.dto.ChatResponseDTO(reply.toString(), suggestedActions);
    }
}
