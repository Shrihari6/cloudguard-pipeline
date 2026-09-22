package com.cloudguard.backend.service;

import com.cloudguard.backend.dto.CanvasGraphDTO;
import com.cloudguard.backend.dto.CanvasMetricsResponseDTO;
import com.cloudguard.backend.dto.ChatMessageDTO;
import com.cloudguard.backend.dto.ChatResponseDTO;
import com.cloudguard.backend.dto.NodeMetricsDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Production Groq LLM integration for CloudGuard AI Copilot.
 *
 * <p>Sends the full conversation history, real-time canvas topology, and
 * 3-layer compliance metrics to the Groq API so the model can:
 * <ul>
 *   <li>Answer general AWS architecture questions (e.g. "What is Kinesis?")</li>
 *   <li>Explain the user's active canvas topology and posture score</li>
 *   <li>Suggest concrete remediations for failing security checks</li>
 * </ul>
 *
 * <p>Falls back to {@link MockRemediationAgentService} when the API key is
 * missing or when any Groq call fails.
 */
@Service
@Primary
public class GroqRemediationAgentService implements RemediationAgentService {

    private static final Logger log = LoggerFactory.getLogger(GroqRemediationAgentService.class);

    private static final String GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL_ID = "llama-3.3-70b-versatile";
    private static final int MAX_HISTORY_MESSAGES = 20;

    @Value("${groq.api-key:}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final MockRemediationAgentService fallbackService = new MockRemediationAgentService();

    // ─── RemediationAgentService: suggestRemediations ────────────────────────────

    @Override
    public List<String> suggestRemediations(CanvasGraphDTO graph, List<NodeMetricsDTO> metrics) {
        if (!isApiKeyConfigured()) {
            return fallbackService.suggestRemediations(graph, metrics);
        }

        try {
            String prompt = "Analyze this AWS pipeline graph: "
                    + (graph != null ? graph.nodes() : "[]")
                    + ". Suggest 3 short remediation actions.";

            String systemPrompt = "You are a cloud security expert. "
                    + "Return a concise numbered list of AWS security recommendations.";

            List<Map<String, String>> messages = List.of(
                    Map.of("role", "system", "content", systemPrompt),
                    Map.of("role", "user", "content", prompt)
            );

            String result = callGroq(messages);
            if (result != null && !result.isBlank()) {
                return List.of(result);
            }
        } catch (Exception e) {
            log.error("Groq suggestRemediations failed, falling back to mock: {}", e.getMessage());
        }

        return fallbackService.suggestRemediations(graph, metrics);
    }

    // ─── RemediationAgentService: chatWithCanvasContext ──────────────────────────

    @Override
    public ChatResponseDTO chatWithCanvasContext(
            String userMessage,
            CanvasMetricsResponseDTO metrics,
            CanvasGraphDTO graph) {
        return chatWithCanvasContext(userMessage, metrics, graph, List.of());
    }

    @Override
    public ChatResponseDTO chatWithCanvasContext(
            String userMessage,
            CanvasMetricsResponseDTO metrics,
            CanvasGraphDTO graph,
            List<ChatMessageDTO> history) {

        if (!isApiKeyConfigured()) {
            log.info("Groq API key not configured — delegating to mock service");
            return fallbackService.chatWithCanvasContext(userMessage, metrics, graph, history);
        }

        try {
            // 1. Build the system prompt with canvas context + general AWS instructions
            String systemPrompt = buildSystemPrompt(graph, metrics);

            // 2. Assemble the full messages array: system → history → current user message
            List<Map<String, String>> messages = buildMessagesPayload(systemPrompt, history, userMessage);

            // 3. Call Groq with the complete conversation
            String reply = callGroq(messages);

            if (reply == null || reply.isBlank()) {
                log.warn("Groq returned empty response — falling back to mock");
                return fallbackService.chatWithCanvasContext(userMessage, metrics, graph, history);
            }

            // 4. Build contextual suggested actions based on current posture
            List<String> suggestedActions = buildSuggestedActions(metrics);

            return new ChatResponseDTO(reply, suggestedActions);

        } catch (Exception e) {
            log.error("Groq chatWithCanvasContext failed: {}", e.getMessage(), e);
            return fallbackService.chatWithCanvasContext(userMessage, metrics, graph, history);
        }
    }

    // ─── System Prompt Builder ───────────────────────────────────────────────────

    /**
     * Constructs a detailed system prompt that instructs the LLM to:
     * - Answer general AWS architecture questions concisely
     * - Reference the user's live canvas topology when relevant
     * - Provide actionable security recommendations based on posture scores
     */
    private String buildSystemPrompt(CanvasGraphDTO graph, CanvasMetricsResponseDTO metrics) {
        String canvasNodes = (graph != null && graph.nodes() != null)
                ? graph.nodes().toString() : "[]";
        int passed = (metrics != null) ? metrics.totalPassedChecks() : 0;
        int possible = (metrics != null) ? metrics.totalPossibleChecks() : 0;
        double scorePercent = (metrics != null) ? metrics.overallScorePercentage() : 0.0;
        int failedCount = (metrics != null && metrics.suggestedRemediations() != null)
                ? metrics.suggestedRemediations().size() : 0;

        return """
                You are **CloudGuard AI**, an expert AWS Cloud Security Copilot embedded in an \
                interactive pipeline builder. You have two responsibilities:

                ## 1. General AWS Knowledge
                - Concisely answer any AWS architecture or service question (e.g. "What is Kinesis?", \
                "How does IAM work?", "Explain VPC peering").
                - Use AWS best-practice references (Well-Architected Framework, NIST SP 800-53, CIS AWS).
                - When the question is general and unrelated to the canvas, answer it directly \
                without referencing the topology.

                ## 2. Canvas-Aware Security Analysis
                When the user asks about their pipeline, compliance, or security posture, reference \
                the live canvas data below:

                **Active Canvas Topology:** %s
                **Security Posture Score:** %d / %d (%.1f%%)
                **Outstanding Remediation Items:** %d

                Evaluate each node against the 3-layer security model:
                - **L1 — Identity (IAM):** Every data/compute node must connect to an IAM Role.
                - **L2 — Encryption (KMS):** Every storage/stream node must connect to a KMS Key.
                - **L3 — Observability (CloudWatch):** Every compute/database node must connect to CloudWatch.

                ## Response Formatting
                - Use **bold** for key terms and service names.
                - Use bullet points (•) for lists.
                - Keep responses concise — aim for 3–6 bullet points per answer.
                - Use inline `code` for AWS resource names, ARNs, and CLI commands.
                - Never return raw JSON or unformatted walls of text.
                """.formatted(canvasNodes, passed, possible, scorePercent, failedCount);
    }

    // ─── Messages Payload Builder ────────────────────────────────────────────────

    /**
     * Assembles the ordered messages list for the Groq API:
     *   [system] → [history...] → [current user message]
     *
     * History is capped at {@link #MAX_HISTORY_MESSAGES} to stay within context limits.
     */
    private List<Map<String, String>> buildMessagesPayload(
            String systemPrompt,
            List<ChatMessageDTO> history,
            String userMessage) {

        List<Map<String, String>> messages = new ArrayList<>();

        // System instruction — always first
        messages.add(Map.of("role", "system", "content", systemPrompt));

        // Append conversation history (capped to avoid token overflow)
        if (history != null && !history.isEmpty()) {
            List<ChatMessageDTO> trimmedHistory = history.size() > MAX_HISTORY_MESSAGES
                    ? history.subList(history.size() - MAX_HISTORY_MESSAGES, history.size())
                    : history;

            for (ChatMessageDTO msg : trimmedHistory) {
                String role = msg.role();
                String content = msg.content();
                if (role != null && content != null && !content.isBlank()) {
                    // Groq API expects "user" or "assistant" roles only
                    String normalizedRole = "assistant".equalsIgnoreCase(role) ? "assistant" : "user";
                    messages.add(Map.of("role", normalizedRole, "content", content));
                }
            }
        }

        // Current user message — always last
        messages.add(Map.of("role", "user", "content", userMessage != null ? userMessage : ""));

        return messages;
    }

    // ─── Suggested Actions Builder ───────────────────────────────────────────────

    /**
     * Generates contextual quick-action suggestions based on the current posture score.
     */
    private List<String> buildSuggestedActions(CanvasMetricsResponseDTO metrics) {
        List<String> actions = new ArrayList<>();

        if (metrics != null && metrics.overallScorePercentage() < 100) {
            actions.add("Why did my score drop?");
            actions.add("How do I fix failing checks?");
        }
        if (metrics != null && metrics.suggestedRemediations() != null
                && !metrics.suggestedRemediations().isEmpty()) {
            actions.add("Explain the top remediation");
        }

        // Always include general knowledge actions
        actions.add("Explain KMS Key Policy");
        actions.add("What is the AWS Shared Responsibility Model?");

        return actions;
    }

    // ─── Groq API Caller ─────────────────────────────────────────────────────────

    /**
     * Sends a complete messages array to the Groq Chat Completions API and returns
     * the assistant's reply text, or {@code null} on failure.
     */
    @SuppressWarnings("unchecked")
    private String callGroq(List<Map<String, String>> messages) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey.trim());

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", MODEL_ID);
            body.put("messages", messages);
            body.put("temperature", 0.4);
            body.put("max_tokens", 1024);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            log.debug("Calling Groq API with {} messages (model: {})", messages.size(), MODEL_ID);
            ResponseEntity<Map> response = restTemplate.exchange(
                    GROQ_API_URL, HttpMethod.POST, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> choices =
                        (List<Map<String, Object>>) response.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> message =
                            (Map<String, Object>) choices.get(0).get("message");
                    String content = (String) message.get("content");
                    log.info("Groq API call succeeded — model: {}, response length: {} chars",
                            MODEL_ID, content != null ? content.length() : 0);
                    return content;
                }
            }

            log.warn("Groq API returned unexpected response structure: status={}",
                    response.getStatusCode());
        } catch (Exception e) {
            log.error("Groq API call failed: {}", e.getMessage(), e);
        }
        return null;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    /**
     * Returns {@code true} if a real Groq API key is configured (not blank or placeholder).
     */
    private boolean isApiKeyConfigured() {
        return apiKey != null
                && !apiKey.isBlank()
                && !apiKey.startsWith("gsk_your");
    }
}