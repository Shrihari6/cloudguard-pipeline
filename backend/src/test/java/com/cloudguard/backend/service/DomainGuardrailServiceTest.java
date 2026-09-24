package com.cloudguard.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DomainGuardrailServiceTest {

    private DomainGuardrailService guardrailService;

    @BeforeEach
    void setUp() {
        guardrailService = new DomainGuardrailService();
    }

    @Test
    @DisplayName("Off-topic celebrity query 'whats the height of salman khan' is rejected")
    void offTopic_salmanKhan_isRejected() {
        boolean relevant = guardrailService.isDomainRelevant("whats the height of salman khan");
        assertThat(relevant).isFalse();
    }

    @Test
    @DisplayName("Off-topic general trivia questions are rejected")
    void offTopic_generalTrivia_isRejected() {
        assertThat(guardrailService.isDomainRelevant("tell me a recipe for chocolate cake")).isFalse();
        assertThat(guardrailService.isDomainRelevant("who won the cricket world cup?")).isFalse();
        assertThat(guardrailService.isDomainRelevant("what is the capital of France?")).isFalse();
        assertThat(guardrailService.isDomainRelevant("sing a song for me")).isFalse();
    }

    @Test
    @DisplayName("Valid AWS & cloud security questions are accepted")
    void validCloudQueries_areAccepted() {
        assertThat(guardrailService.isDomainRelevant("What is S3 bucket encryption?")).isTrue();
        assertThat(guardrailService.isDomainRelevant("Why does Kinesis need an IAM Role connected?")).isTrue();
        assertThat(guardrailService.isDomainRelevant("How do I fix L2 Encryption with KMS?")).isTrue();
        assertThat(guardrailService.isDomainRelevant("Explain CIS AWS compliance")).isTrue();
        assertThat(guardrailService.isDomainRelevant("Auto-fix the pipeline topology")).isTrue();
        assertThat(guardrailService.isDomainRelevant("hello")).isTrue();
        assertThat(guardrailService.isDomainRelevant("help")).isTrue();
    }
}
