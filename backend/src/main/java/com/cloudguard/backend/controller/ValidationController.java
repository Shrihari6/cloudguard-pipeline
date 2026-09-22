package com.cloudguard.backend.controller;

import com.cloudguard.backend.dto.CanvasGraphDTO;
import com.cloudguard.backend.dto.CanvasMetricsResponseDTO;
import com.cloudguard.backend.engine.DeterministicRuleEngine;
import com.cloudguard.backend.service.RemediationAgentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for deterministic pipeline security validation.
 *
 * POST /api/pipeline/validate
 *   Accepts a CanvasGraphDTO (nodes + edges from the React Flow canvas)
 *   and returns a CanvasMetricsResponseDTO with per-node 3-layer security scores.
 *
 * This endpoint is PURELY DETERMINISTIC — no LLM calls are made here.
 * CORS is open for local development; lock down APP_FRONTEND_URL in production.
 */
@RestController
@RequestMapping("/api/pipeline")
public class ValidationController {

    private final DeterministicRuleEngine ruleEngine;
    private final RemediationAgentService remediationService;

    public ValidationController(DeterministicRuleEngine ruleEngine,
                                 RemediationAgentService remediationService) {
        this.ruleEngine = ruleEngine;
        this.remediationService = remediationService;
    }

    /**
     * Validate pipeline security posture.
     *
     * Request body: { "nodes": [...], "edges": [...] }
     * Response: CanvasMetricsResponseDTO with overall score and per-node layer breakdown.
     */
    @PostMapping("/validate")
    public ResponseEntity<CanvasMetricsResponseDTO> validate(
            @Valid @RequestBody CanvasGraphDTO graph) {

        // 1. Run deterministic 3-layer engine
        CanvasMetricsResponseDTO baseMetrics = ruleEngine.evaluate(graph);

        // 2. Enrich with additional AI/mock remediation suggestions
        //    (merged with engine-generated remediations already in baseMetrics)
        var aiSuggestions = remediationService.suggestRemediations(
                graph, baseMetrics.nodeMetricsList());

        // Merge: engine remediations first (specific), then AI/mock (global)
        var allRemediations = new java.util.ArrayList<>(baseMetrics.suggestedRemediations());
        aiSuggestions.forEach(s -> {
            if (!allRemediations.contains(s)) allRemediations.add(s);
        });

        var response = new CanvasMetricsResponseDTO(
                baseMetrics.totalPassedChecks(),
                baseMetrics.totalPossibleChecks(),
                baseMetrics.overallScorePercentage(),
                baseMetrics.nodeMetricsList(),
                allRemediations
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Interactive canvas-aware AI Chatbot endpoint.
     *
     * Request body: ChatRequestDTO (userMessage, graph, history)
     * Evaluates real-time compliance context with DeterministicRuleEngine
     * and delegates to RemediationAgentService for contextual natural-language response.
     */
    @PostMapping("/chat")
    public ResponseEntity<com.cloudguard.backend.dto.ChatResponseDTO> chat(
            @Valid @RequestBody com.cloudguard.backend.dto.ChatRequestDTO request) {
        CanvasMetricsResponseDTO metrics = ruleEngine.evaluateGraphMetrics(request.graph());
        com.cloudguard.backend.dto.ChatResponseDTO response = remediationService.chatWithCanvasContext(
                request.userMessage(),
                metrics,
                request.graph(),
                request.history()
        );
        return ResponseEntity.ok(response);
    }
}
