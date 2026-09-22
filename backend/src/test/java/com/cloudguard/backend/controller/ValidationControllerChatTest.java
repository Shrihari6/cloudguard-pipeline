package com.cloudguard.backend.controller;

import com.cloudguard.backend.dto.*;
import com.cloudguard.backend.engine.DeterministicRuleEngine;
import com.cloudguard.backend.service.MockRemediationAgentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ValidationControllerChatTest {

    private ValidationController controller;
    private DeterministicRuleEngine ruleEngine;
    private MockRemediationAgentService remediationService;

    @BeforeEach
    void setup() {
        ruleEngine = new DeterministicRuleEngine();
        remediationService = new MockRemediationAgentService();
        controller = new ValidationController(ruleEngine, remediationService);
    }

    private NodeData node(String id, String type) {
        return new NodeData(id, type, type.toUpperCase());
    }

    private EdgeData edge(String source, String target) {
        return new EdgeData("e-" + source + "-" + target, source, target);
    }

    @Test
    @DisplayName("POST /api/pipeline/chat with validation prompt returns full security breakdown")
    void chat_validationPrompt_returnsBreakdown() {
        var graph = new CanvasGraphDTO(
                List.of(
                        node("kinesis-1", "kinesis"),
                        node("iam-1", "iam"),
                        node("kms-1", "kms")
                ),
                List.of(
                        edge("iam-1", "kinesis-1"),
                        edge("kms-1", "kinesis-1")
                )
        );

        var request = new ChatRequestDTO("System: Validating current pipeline topology...", graph, List.of());
        ResponseEntity<ChatResponseDTO> response = controller.chat(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).contains("Pipeline Security Evaluation Breakdown");
        assertThat(response.getBody().suggestedActions()).isNotEmpty();
    }

    @Test
    @DisplayName("POST /api/pipeline/chat about IAM returns least privilege explanation")
    void chat_iamPrompt_returnsIamDetails() {
        var graph = new CanvasGraphDTO(
                List.of(node("kinesis-1", "kinesis")),
                List.of()
        );

        var request = new ChatRequestDTO("Why does Kinesis need an IAM Role connected?", graph, List.of());
        ResponseEntity<ChatResponseDTO> response = controller.chat(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).contains("IAM & Least-Privilege Architecture");
        assertThat(response.getBody().message()).contains("AssumeRole");
    }

    @Test
    @DisplayName("POST /api/pipeline/chat about KMS returns encryption remediation steps")
    void chat_kmsPrompt_returnsKmsDetails() {
        var graph = new CanvasGraphDTO(
                List.of(node("s3-1", "s3")),
                List.of()
        );

        var request = new ChatRequestDTO("How do I fix L2 Encryption?", graph, List.of());
        ResponseEntity<ChatResponseDTO> response = controller.chat(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).contains("Layer 2 — KMS Encryption at Rest");
        assertThat(response.getBody().suggestedActions()).contains("Why does Kinesis need an IAM Role connected?");
    }
}
