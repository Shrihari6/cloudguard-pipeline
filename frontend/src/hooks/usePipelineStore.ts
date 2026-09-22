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
  CanvasMetricsResponseDTO,
  ChatMessage,
  ChatRequestDTO,
  ChatResponseDTO,
} from '@/types';
import { NODE_REGISTRY } from '@/lib/nodeRegistry';
import { getChecksForNode } from '@/lib/securityRules';
import { layoutPipeline } from '@/lib/layoutPipeline';

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-init',
    sender: 'assistant',
    text: "👋 **CloudGuard AI Copilot** is online!\n\nI monitor your live canvas topology for AWS security compliance across **Identity (IAM)**, **Encryption (KMS)**, and **Observability (CloudWatch)**.\n\nAdd nodes, connect edges, click **Validate Pipeline**, or pick a quick prompt below.",
    suggestedActions: [
      'Validate Pipeline',
      'Why does Kinesis need an IAM Role connected?',
      'How do I fix L2 Encryption?',
      'Why did my score drop?',
    ],
    timestamp: 'Live',
  },
];

export interface PipelineState {
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  activePanelView: ActivePanelView;
  validationReport: ValidationReportDTO | null;
  metricsResponse: CanvasMetricsResponseDTO | null;
  isValidating: boolean;
  canvasTheme: CanvasTheme;

  // Chat State
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  sendChatMessage: (userMessage: string, isSystem?: boolean) => Promise<void>;
  setActivePanelView: (view: ActivePanelView) => void;

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
  setMetricsResponse: (metrics: CanvasMetricsResponseDTO | null) => void;
  validatePipeline: () => Promise<CanvasMetricsResponseDTO | null>;
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
  activePanelView: 'CHAT',
  validationReport: null,
  metricsResponse: null,
  isValidating: false,
  canvasTheme: 'dark',
  chatMessages: INITIAL_CHAT_MESSAGES,
  isChatLoading: false,

  setActivePanelView: (activePanelView: ActivePanelView) => {
    set({ activePanelView });
  },

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
    const hasRemoval = changes.some((c) => c.type === 'remove');
    if (hasRemoval) {
      get().validatePipeline();
    }
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
      activePanelView: get().activePanelView === 'CHAT' ? 'CHAT' : 'NODE_CHECKLIST',
    });

    get().validatePipeline();

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

    get().validatePipeline();
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
      activePanelView: isSelected && get().activePanelView === 'NODE_CHECKLIST' ? 'CHAT' : get().activePanelView,
    });

    get().validatePipeline();
  },

  removeEdge: (id) => {
    const currentEdges = get().edges.filter((e) => e.id !== id);

    set({
      edges: currentEdges,
    });

    get().validatePipeline();
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
      activePanelView: 'CHAT',
      validationReport: null,
      metricsResponse: null,
      isValidating: false,
    });
  },

  sendChatMessage: async (userMessage: string, isSystem = false) => {
    const trimmed = userMessage.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: isSystem ? 'system' : 'user',
      text: userMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    set((state) => ({
      chatMessages: [...state.chatMessages, userMsg],
      isChatLoading: true,
      activePanelView: 'CHAT',
    }));

    try {
      const { nodes, edges } = get();
      const payload: ChatRequestDTO = {
        userMessage,
        graph: {
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.data.type,
            label: n.data.label,
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
          })),
        },
        history: get()
          .chatMessages.filter((m) => m.sender === 'user' || m.sender === 'assistant')
          .map((m) => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
      };

      // Also trigger deterministic validation so metrics stay fresh
      get().validatePipeline();

      const res = await fetch('http://localhost:8081/api/pipeline/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Chat HTTP ${res.status}: ${res.statusText}`);
      }

      const data: ChatResponseDTO = await res.json();

      const assistantMsg: ChatMessage = {
        id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: 'assistant',
        text: data.message,
        suggestedActions: data.suggestedActions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      set((state) => ({
        chatMessages: [...state.chatMessages, assistantMsg],
        isChatLoading: false,
      }));
    } catch (err) {
      console.warn('Chat request failed:', err);
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: '⚠️ Unable to connect to the CloudGuard Copilot service. Please ensure the backend is running on `http://localhost:8081`.',
        suggestedActions: [
          'Validate Pipeline',
          'Why does Kinesis need an IAM Role connected?',
          'How do I fix L2 Encryption?',
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      set((state) => ({
        chatMessages: [...state.chatMessages, errMsg],
        isChatLoading: false,
      }));
    }
  },

  setValidationReport: (report) => {
    set({
      validationReport: report,
      activePanelView: 'GLOBAL_REPORT',
    });
  },

  setMetricsResponse: (metricsResponse) => {
    set({ metricsResponse });
  },

  validatePipeline: async () => {
    const { nodes, edges } = get();
    if (nodes.length === 0) {
      set({ metricsResponse: null, isValidating: false });
      return null;
    }
    set({ isValidating: true });
    try {
      const payload = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data.type,
          label: n.data.label,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
      };

      const res = await fetch('http://localhost:8081/api/pipeline/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Validation HTTP ${res.status}: ${res.statusText}`);
      }

      const data: CanvasMetricsResponseDTO = await res.json();
      set({ metricsResponse: data, isValidating: false });
      return data;
    } catch (err) {
      console.warn('Backend validation request failed:', err);
      set({ isValidating: false });
      return null;
    }
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
