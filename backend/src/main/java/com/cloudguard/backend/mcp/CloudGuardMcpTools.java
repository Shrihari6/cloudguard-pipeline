package com.cloudguard.backend.mcp;

import com.cloudguard.backend.dto.CanvasGraphDTO;
import com.cloudguard.backend.dto.CanvasMetricsResponseDTO;
import com.cloudguard.backend.engine.DeterministicRuleEngine;
import org.springframework.stereotype.Component;

/**
 * Exposes CloudGuard pipeline validation capabilities as an MCP (Model Context Protocol) tool.
 * Evaluates React Flow canvas topology for 3-layer cloud security metrics and auto-remediations.
 */
@Component
public class CloudGuardMcpTools {

    private final DeterministicRuleEngine ruleEngine;

    public CloudGuardMcpTools(DeterministicRuleEngine ruleEngine) {
        this.ruleEngine = ruleEngine;
    }

    @McpTool(
        name = "validateCanvasGraph",
        description = "Evaluates React Flow canvas topology for 3-layer cloud security metrics and auto-remediations"
    )
    public CanvasMetricsResponseDTO validateCanvasGraph(CanvasGraphDTO canvas) {
        return ruleEngine.evaluateGraphMetrics(canvas);
    }
}
