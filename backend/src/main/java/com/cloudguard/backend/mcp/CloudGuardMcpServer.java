package com.cloudguard.backend.mcp;

import com.cloudguard.backend.dto.CanvasGraphDTO;
import com.cloudguard.backend.dto.CanvasMetricsResponseDTO;
import com.cloudguard.backend.engine.DeterministicRuleEngine;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * CloudGuard MCP Server — exposes the DeterministicRuleEngine as MCP-compatible tools.
 *
 * MCP (Model Context Protocol) Tool Manifest:
 *   GET  /api/mcp/tools           → returns JSON tool manifest listing available tools
 *   POST /api/mcp/tools/validateCanvasGraph → runs validation, returns CanvasMetricsResponseDTO
 *
 * Any external LLM client (Claude Desktop, Cursor, Copilot Studio, etc.) configured
 * to point at this server can invoke "validateCanvasGraph" as a structured tool call.
 *
 * To upgrade to native Spring AI MCP Server when the library stabilises:
 *   1. Add spring-ai-starter-mcp-server dependency
 *   2. Annotate methods with @Tool (Spring AI 1.x) or @McpTool (milestone releases)
 *   3. Remove this class — Spring AI auto-registers the beans
 */
@RestController
@RequestMapping("/api/mcp")
@CrossOrigin(origins = "*")
public class CloudGuardMcpServer {

    private final DeterministicRuleEngine ruleEngine;

    public CloudGuardMcpServer(DeterministicRuleEngine ruleEngine) {
        this.ruleEngine = ruleEngine;
    }

    /**
     * MCP Tool Manifest — describes available tools in MCP JSON schema format.
     * An LLM client calls GET /api/mcp/tools to discover what this server can do.
     */
    @GetMapping(value = "/tools", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> listTools() {
        var toolManifest = Map.of(
                "serverName", "cloudguard-pipeline",
                "serverVersion", "1.0.0",
                "tools", List.of(
                        Map.of(
                                "name", "validateCanvasGraph",
                                "description", "Performs deterministic 3-layer security validation " +
                                        "(Identity/IAM, Encryption/KMS, Observability/CloudWatch) " +
                                        "on an AWS pipeline graph and returns per-node security scores " +
                                        "and remediation suggestions.",
                                "inputSchema", Map.of(
                                        "type", "object",
                                        "properties", Map.of(
                                                "nodes", Map.of(
                                                        "type", "array",
                                                        "description", "List of pipeline nodes with id, type (lowercase AWS service key), and label",
                                                        "items", Map.of(
                                                                "type", "object",
                                                                "properties", Map.of(
                                                                        "id", Map.of("type", "string"),
                                                                        "type", Map.of("type", "string",
                                                                                "enum", List.of("kinesis","s3","sqs","lambda","glue","emr",
                                                                                        "rds","dynamodb","redshift","iam","kms","waf",
                                                                                        "cloudwatch","guardduty")),
                                                                        "label", Map.of("type", "string")
                                                                ),
                                                                "required", List.of("id", "type")
                                                        )
                                                ),
                                                "edges", Map.of(
                                                        "type", "array",
                                                        "description", "List of directed edges connecting node ids",
                                                        "items", Map.of(
                                                                "type", "object",
                                                                "properties", Map.of(
                                                                        "id", Map.of("type", "string"),
                                                                        "source", Map.of("type", "string"),
                                                                        "target", Map.of("type", "string")
                                                                ),
                                                                "required", List.of("source", "target")
                                                        )
                                                )
                                        ),
                                        "required", List.of("nodes", "edges")
                                )
                        )
                )
        );
        return ResponseEntity.ok(toolManifest);
    }

    /**
     * MCP Tool: validateCanvasGraph
     *
     * Accepts a CanvasGraphDTO and returns full security metrics.
     * This is the same engine used by POST /api/pipeline/validate — exposed
     * here so MCP clients can call it as a structured tool.
     *
     * @McpTool — (Semantic annotation; replace with Spring AI @Tool when adopting native MCP)
     * Tool name: "validateCanvasGraph"
     * Description: "3-layer security check of an AWS pipeline graph"
     */
    @PostMapping(value = "/tools/validateCanvasGraph",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CanvasMetricsResponseDTO> validateCanvasGraph(
            @Valid @RequestBody CanvasGraphDTO graph) {

        CanvasMetricsResponseDTO result = ruleEngine.evaluate(graph);
        return ResponseEntity.ok(result);
    }
}
