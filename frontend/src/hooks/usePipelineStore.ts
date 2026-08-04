import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  OnEdgesChange,
  OnNodesChange,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge as rfAddEdge,
} from 'reactflow';
import {
  ActivePanelView,
  CanvasTheme,
  NodeType,
  PipelineNodeData,
  SuggestionDTO,
  ValidationReportDTO,
} from '@/types';
import { NODE_REGISTRY } from '@/lib/nodeRegistry';
import { getChecksForNode } from '@/lib/securityRules';
import { layoutPipeline } from '@/lib/layoutPipeline';

export interface PipelineState {
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  activePanelView: ActivePanelView;
  validationReport: ValidationReportDTO | null;
  canvasTheme: CanvasTheme;

  // React Flow state handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;

  // Canvas Actions
  addNode: (
    type: NodeType,
    position: { x: number; y: number },
    origin?: 'user' | 'agent'
  ) => string;
  addEdge: (connection: Connection | Edge) => void;
  removeNode: (id: string) => void;
  removeEdge: (id: string) => void;
  selectNode: (id: string | null) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  toggleSecurityCheck: (nodeId: string, checkId: string) => void;
  clearCanvas: () => void;
  setValidationReport: (report: ValidationReportDTO | null) => void;
  setCanvasTheme: (theme: CanvasTheme) => void;
  acceptSuggestion: (suggestion: SuggestionDTO, defaultPosition?: { x: number; y: number }) => void;

  triggerAutoLayout: () => void;
  // Selectors
  getSelectedNode: () => Node<PipelineNodeData> | undefined;
  getSecuritySummary: () => { total: number; checked: number };
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  activePanelView: 'GLOBAL_REPORT',
  validationReport: null,
  canvasTheme: 'dark',

  setCanvasTheme: (canvasTheme: CanvasTheme) => {
    set({ canvasTheme });
  },

  onNodesChange: (changes: NodeChange[]) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as Node<PipelineNodeData>[],
    }));
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },

  addNode: (type, position, origin = 'user') => {
    const meta = NODE_REGISTRY[type];
    if (!meta) {
      console.error(`Unknown node type: ${type}`);
      return '';
    }

    const id = `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newNode: Node<PipelineNodeData> = {
      id,
      type: 'pipelineNode',
      position,
      data: {
        type,
        label: meta.label,
        desc: meta.desc,
        color: meta.color,
        abbrev: meta.abbrev,
        checks: getChecksForNode(type),
        origin,
        isManuallyPositioned: true, // Preserve exact drop coordinates
      },
    };

    const currentNodes = get().nodes;

    set({
      nodes: [...currentNodes, newNode],
      selectedNodeId: id,
      activePanelView: 'NODE_CHECKLIST',
    });

    return id;
  },

  addEdge: (connection) => {
    const currentEdges = get().edges;

    const newEdge: Edge = {
      ...connection,
      id: `e-${connection.source}-${connection.target}`,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#38bdf8', strokeWidth: 2.5 },
    } as Edge;

    const updatedEdges = rfAddEdge(newEdge, currentEdges);

    set({
      edges: updatedEdges,
    });
  },

  removeNode: (id) => {
    const currentNodes = get().nodes.filter((n) => n.id !== id);
    const currentEdges = get().edges.filter(
      (e) => e.source !== id && e.target !== id
    );

    const isSelected = get().selectedNodeId === id;

    set({
      nodes: currentNodes,
      edges: currentEdges,
      selectedNodeId: isSelected ? null : get().selectedNodeId,
      activePanelView: isSelected ? 'GLOBAL_REPORT' : get().activePanelView,
    });
  },

  removeEdge: (id) => {
    const currentEdges = get().edges.filter((e) => e.id !== id);

    set({
      edges: currentEdges,
    });
  },

  triggerAutoLayout: () => {
    const { nodes, edges } = get();
    if (nodes.length === 0) return;

    // Reset manual position flags temporarily to perform layout
    const freeNodes = nodes.map((n) => ({
      ...n,
      data: { ...n.data, isManuallyPositioned: false },
    }));

    const rearranged = layoutPipeline(freeNodes, edges);
    set({ nodes: rearranged });
  },

  selectNode: (id) => {
    set({
      selectedNodeId: id,
      activePanelView: id ? 'NODE_CHECKLIST' : 'GLOBAL_REPORT',
    });
  },

  updateNodePosition: (id, position) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            position,
            data: {
              ...node.data,
              isManuallyPositioned: true,
            },
          };
        }
        return node;
      }),
    }));
  },

  toggleSecurityCheck: (nodeId, checkId) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              checks: node.data.checks.map((chk) =>
                chk.id === checkId ? { ...chk, checked: !chk.checked } : chk
              ),
            },
          };
        }
        return node;
      }),
    }));
  },

  clearCanvas: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      activePanelView: 'GLOBAL_REPORT',
      validationReport: null,
    });
  },

  setValidationReport: (report) => {
    set({
      validationReport: report,
      activePanelView: 'GLOBAL_REPORT',
    });
  },

  acceptSuggestion: (suggestion, defaultPosition = { x: 250, y: 150 }) => {
    const { addNode, addEdge, nodes } = get();

    if (!suggestion.nodeType) return;

    // Compute an offset so AI-added nodes don't stack on top of each other
    const offset = nodes.length * 20;
    const position = {
      x: defaultPosition.x + offset,
      y: defaultPosition.y + offset,
    };

    // Add node created by AI agent — origin 'agent' prevents chat loop
    const newId = addNode(suggestion.nodeType, position, 'agent');

    // Add edge if suggestion specifies connection
    if (newId && suggestion.edge) {
      addEdge({
        source: suggestion.edge.source,
        target: newId,
        sourceHandle: null,
        targetHandle: null,
      });
    }
  },

  getSelectedNode: () => {
    const { nodes, selectedNodeId } = get();
    return nodes.find((n) => n.id === selectedNodeId);
  },

  getSecuritySummary: () => {
    const { nodes } = get();
    let total = 0;
    let checked = 0;

    nodes.forEach((n) => {
      n.data.checks.forEach((c) => {
        total++;
        if (c.checked) checked++;
      });
    });

    return { total, checked };
  },
}));
