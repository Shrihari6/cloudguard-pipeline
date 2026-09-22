package com.cloudguard.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * Top-level request body for POST /api/pipeline/validate.
 * Represents the full canvas graph as nodes + edges, matching the
 * React Flow canvas state (with UI fields stripped by ReactFlowToBackendParser).
 */
public record CanvasGraphDTO(
        @NotNull @Valid List<NodeData> nodes,
        @NotNull @Valid List<EdgeData> edges
) {}
