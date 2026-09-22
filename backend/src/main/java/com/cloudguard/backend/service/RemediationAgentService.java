package com.cloudguard.backend.service;

import com.cloudguard.backend.dto.CanvasGraphDTO;
import com.cloudguard.backend.dto.CanvasMetricsResponseDTO;
import com.cloudguard.backend.dto.ChatMessageDTO;
import com.cloudguard.backend.dto.ChatResponseDTO;
import com.cloudguard.backend.dto.NodeMetricsDTO;

import java.util.List;

/**
 * Interface for AI-assisted remediation suggestions.
 * Currently backed by a deterministic mock — swap in LangChain4j / Groq / Ollama
 * implementation by creating a new @Primary bean that implements this interface.
 *
 * Contract: given the graph and per-node metrics, return a list of human-readable
 * remediation action strings. Must never call the rule engine or modify state.
 */
public interface RemediationAgentService {
    /**
     * Generate remediation suggestions for the given graph and its computed metrics.
     *
     * @param graph   the canvas graph that was validated
     * @param metrics per-node security metrics computed by DeterministicRuleEngine
     * @return ordered list of actionable remediation strings (may be empty, never null)
     */
    List<String> suggestRemediations(CanvasGraphDTO graph, List<NodeMetricsDTO> metrics);

    /**
     * Synthesize an explanatory response for chat queries using active canvas graph topology
     * and real-time security metrics.
     *
     * @param prompt  the user's question or system command
     * @param metrics real-time security compliance metrics computed by DeterministicRuleEngine
     * @param graph   the current canvas topology (nodes & edges)
     * @return ChatResponseDTO containing explanation message and suggested action chips
     */
    ChatResponseDTO chatWithCanvasContext(
            String prompt,
            com.cloudguard.backend.dto.CanvasMetricsResponseDTO metrics,
            CanvasGraphDTO graph
    );

    /**
     * Overload supporting conversation history.
     */
    default ChatResponseDTO chatWithCanvasContext(
            String prompt,
            com.cloudguard.backend.dto.CanvasMetricsResponseDTO metrics,
            CanvasGraphDTO graph,
            List<com.cloudguard.backend.dto.ChatMessageDTO> history
    ) {
        return chatWithCanvasContext(prompt, metrics, graph);
    }
}
