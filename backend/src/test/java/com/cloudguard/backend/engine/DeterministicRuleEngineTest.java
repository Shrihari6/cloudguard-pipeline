package com.cloudguard.backend.engine;

import com.cloudguard.backend.dto.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for DeterministicRuleEngine.
 * No Spring context needed — tests pure logic only.
 */
class DeterministicRuleEngineTest {

    private DeterministicRuleEngine engine;

    @BeforeEach
    void setup() {
        engine = new DeterministicRuleEngine();
    }

    // ─── Helper builders ─────────────────────────────────────────────────────

    private NodeData node(String id, String type) {
        return new NodeData(id, type, type.toUpperCase());
    }

    private EdgeData edge(String source, String target) {
        return new EdgeData("e-" + source + "-" + target, source, target);
    }

    // ─── Layer 1: Identity (IAM) ─────────────────────────────────────────────

    @Test
    @DisplayName("Lambda with no IAM connection → layer1Identity fails")
    void missingIam_lambdaFails() {
        var graph = new CanvasGraphDTO(
                List.of(node("n1", "lambda")),
                List.of() // no edges
        );
        var result = engine.evaluate(graph);

        var lambdaMetrics = result.nodeMetricsList().get(0);
        assertThat(lambdaMetrics.layer1Identity().isPassed()).isFalse();
        assertThat(lambdaMetrics.score()).isLessThan(100);
    }

    @Test
    @DisplayName("Lambda connected to IAM → layer1Identity passes")
    void withIam_lambdaPasses() {
        var graph = new CanvasGraphDTO(
                List.of(node("n1", "lambda"), node("n2", "iam")),
                List.of(edge("n1", "n2"))
        );
        var result = engine.evaluate(graph);

        var lambdaMetrics = result.nodeMetricsList().stream()
                .filter(m -> m.nodeType().equals("lambda")).findFirst().orElseThrow();
        assertThat(lambdaMetrics.layer1Identity().isPassed()).isTrue();
    }

    // ─── Layer 2: Encryption (KMS) ───────────────────────────────────────────

    @Test
    @DisplayName("S3 with no KMS connection → layer2Encryption fails")
    void missingKms_s3Fails() {
        var graph = new CanvasGraphDTO(
                List.of(node("n1", "s3"), node("n2", "iam")),
                List.of(edge("n1", "n2"))
        );
        var result = engine.evaluate(graph);

        var s3Metrics = result.nodeMetricsList().stream()
                .filter(m -> m.nodeType().equals("s3")).findFirst().orElseThrow();
        assertThat(s3Metrics.layer2Encryption().isPassed()).isFalse();
    }

    @Test
    @DisplayName("Kinesis with no KMS connection → layer2Encryption fails")
    void missingKms_kinesisFails() {
        var graph = new CanvasGraphDTO(
                List.of(node("n1", "kinesis")),
                List.of()
        );
        var result = engine.evaluate(graph);

        var kinesisMetrics = result.nodeMetricsList().get(0);
        assertThat(kinesisMetrics.layer2Encryption().isPassed()).isFalse();
    }

    @Test
    @DisplayName("S3 connected to KMS → layer2Encryption passes")
    void withKms_s3Passes() {
        var graph = new CanvasGraphDTO(
                List.of(node("n1", "s3"), node("n2", "kms")),
                List.of(edge("n1", "n2"))
        );
        var result = engine.evaluate(graph);

        var s3Metrics = result.nodeMetricsList().stream()
                .filter(m -> m.nodeType().equals("s3")).findFirst().orElseThrow();
        assertThat(s3Metrics.layer2Encryption().isPassed()).isTrue();
    }

    @Test
    @DisplayName("Lambda (compute node) passes KMS check by default — no KMS needed")
    void lambda_kmsExempt() {
        var graph = new CanvasGraphDTO(
                List.of(node("n1", "lambda")),
                List.of()
        );
        var result = engine.evaluate(graph);

        var lambdaMetrics = result.nodeMetricsList().get(0);
        assertThat(lambdaMetrics.layer2Encryption().isPassed()).isTrue();
    }

    // ─── Layer 3: Observability (CloudWatch) ──────────────────────────────────

    @Test
    @DisplayName("Lambda with no CloudWatch → layer3Logging fails")
    void missingCloudWatch_lambdaFails() {
        var graph = new CanvasGraphDTO(
                List.of(node("n1", "lambda")),
                List.of()
        );
        var result = engine.evaluate(graph);

        var lambdaMetrics = result.nodeMetricsList().get(0);
        assertThat(lambdaMetrics.layer3Logging().isPassed()).isFalse();
    }

    @Test
    @DisplayName("Lambda connected to CloudWatch → layer3Logging passes")
    void withCloudWatch_lambdaPasses() {
        var graph = new CanvasGraphDTO(
                List.of(node("n1", "lambda"), node("n2", "cloudwatch")),
                List.of(edge("n2", "n1")) // reverse direction — should still work (bidirectional)
        );
        var result = engine.evaluate(graph);

        var lambdaMetrics = result.nodeMetricsList().stream()
                .filter(m -> m.nodeType().equals("lambda")).findFirst().orElseThrow();
        assertThat(lambdaMetrics.layer3Logging().isPassed()).isTrue();
    }

    // ─── Score calculation ───────────────────────────────────────────────────

    @Test
    @DisplayName("Fully secured pipeline → overallScorePercentage = 100.0")
    void fullyCoveredPipeline_score100() {
        // Lambda needs: IAM (L1), CloudWatch (L3) — KMS exempt for compute
        // S3 needs: IAM (L1), KMS (L2) — CloudWatch exempt for S3
        var nodes = List.of(
                node("lambda1", "lambda"),
                node("s3-1", "s3"),
                node("iam1", "iam"),
                node("kms1", "kms"),
                node("cw1", "cloudwatch")
        );
        var edges = List.of(
                edge("lambda1", "iam1"),
                edge("lambda1", "cw1"),
                edge("s3-1", "iam1"),
                edge("s3-1", "kms1")
        );
        var graph = new CanvasGraphDTO(nodes, edges);
        var result = engine.evaluate(graph);

        assertThat(result.overallScorePercentage()).isEqualTo(100.0);
    }

    @Test
    @DisplayName("Empty graph → 100% score (nothing to fail)")
    void emptyGraph_score100() {
        var graph = new CanvasGraphDTO(List.of(), List.of());
        var result = engine.evaluate(graph);

        assertThat(result.overallScorePercentage()).isEqualTo(100.0);
        assertThat(result.totalPossibleChecks()).isEqualTo(0);
    }

    @Test
    @DisplayName("Single Lambda with no connections → score = 0")
    void singleLambdaNoConnections_scoreZero() {
        // Lambda: L1 (IAM required) + L3 (CloudWatch required) = 2 possible
        // L2 (KMS) is exempt for compute → 0/2 passed → score 0
        var graph = new CanvasGraphDTO(
                List.of(node("n1", "lambda")),
                List.of()
        );
        var result = engine.evaluate(graph);

        var lambdaMetrics = result.nodeMetricsList().get(0);
        assertThat(lambdaMetrics.score()).isEqualTo(0);
        assertThat(result.overallScorePercentage()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Score is correct fraction: 1/2 layers passed = 50%")
    void partialPass_correctFraction() {
        // Lambda: needs IAM (L1) + CloudWatch (L3). Connect only IAM → 1/2 = 50%
        var graph = new CanvasGraphDTO(
                List.of(node("n1", "lambda"), node("n2", "iam")),
                List.of(edge("n1", "n2"))
        );
        var result = engine.evaluate(graph);

        assertThat(result.overallScorePercentage()).isEqualTo(50.0);
    }

    @Test
    @DisplayName("Remediations are generated for missing IAM connection")
    void missingIam_remediationGenerated() {
        var graph = new CanvasGraphDTO(
                List.of(node("n1", "s3")),
                List.of()
        );
        var result = engine.evaluate(graph);

        assertThat(result.suggestedRemediations()).isNotEmpty();
        assertThat(result.suggestedRemediations().get(0)).contains("IAM");
    }

    @Test
    @DisplayName("Security provider nodes (iam, kms, cloudwatch) count 0 possible checks")
    void securityProviderNodes_notCountedInScore() {
        var graph = new CanvasGraphDTO(
                List.of(
                        node("i1", "iam"),
                        node("k1", "kms"),
                        node("c1", "cloudwatch"),
                        node("w1", "waf"),
                        node("g1", "guardduty")
                ),
                List.of()
        );
        var result = engine.evaluate(graph);

        // All security providers → totalPossible = 0 → score = 100 by default
        assertThat(result.totalPossibleChecks()).isEqualTo(0);
        assertThat(result.overallScorePercentage()).isEqualTo(100.0);
    }
}
