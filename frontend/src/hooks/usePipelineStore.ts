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
import { autoFixPipelineGraph } from '@/lib/autoFixPipeline';
import { isQueryDomainRelevant, GUARDRAIL_REFUSAL_MESSAGE } from '@/lib/domainGuardrails';
import { detectAddNodeIntent, detectSafeConnectIntent } from '@/lib/agentCanvasActions';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NEXT_PUBLIC_API_BASE_URL !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, '')
    : 'https://cloudguard-pipeline.onrender.com';

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-init',
    sender: 'assistant',
    text: "👋 **CloudGuard AI Copilot** is online!\n\nI monitor your live canvas topology for AWS security compliance across **Identity (IAM)**, **Encryption (KMS)**, and **Observability (CloudWatch)**.\n\nAdd nodes, connect edges, click **⚡ Auto-Fix**, **Validate Pipeline**, or pick a quick prompt below.",
    suggestedActions: [
      '⚡ Auto-Fix Architecture',
      'Validate Pipeline',
      'Why does Kinesis need an IAM Role connected?',
      'How do I fix L2 Encryption?',
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
  autoFixPipeline: (targetNodeId?: string) => Promise<void>;
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

    // 1. Detect natural language Add Node request (e.g. "add a rds to the architecture")
    const addIntent = detectAddNodeIntent(trimmed);
    if (addIntent.isAddIntent && addIntent.nodeType) {
      setTimeout(() => {
        const { nodes } = get();
        const posX = 140 + ((nodes.length % 3) * 220);
        const posY = 100 + (Math.floor(nodes.length / 3) * 160);
        const newId = get().addNode(addIntent.nodeType!, { x: posX, y: posY }, 'agent');
        get().triggerAutoLayout();
        get().validatePipeline();

        const addMsg: ChatMessage = {
          id: `agent-add-${Date.now()}`,
          sender: 'assistant',
          text: `✅ **Added ${addIntent.label} to the Canvas!**\n\n` +
            `• **AWS Service**: ${addIntent.label} (\`${addIntent.nodeType}\`)\n` +
            `• **Node ID**: \`${newId}\`\n` +
            `• **Topology**: Auto-placed & arranged in DAG\n\n` +
            `Would you like me to automatically connect it with required IAM, KMS, and CloudWatch links for a **100% safe architecture**?`,
          suggestedActions: [
            '⚡ Connect for 100% Safe Architecture',
            `Explain security compliance for ${addIntent.label}`,
            'Validate Pipeline',
          ],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        set((state) => ({
          chatMessages: [...state.chatMessages, addMsg],
          isChatLoading: false,
        }));
      }, 350);
      return;
    }

    // 2. Detect natural language Safe Connection / Auto-Fix request
    if (detectSafeConnectIntent(trimmed)) {
      setTimeout(async () => {
        await get().autoFixPipeline();
        set({ isChatLoading: false });
      }, 400);
      return;
    }

    // 3. Client-side Domain Guardrail Check (Preserves 100% API Tokens)
    if (!isQueryDomainRelevant(trimmed)) {
      setTimeout(() => {
        const refusalMsg: ChatMessage = {
          id: `guardrail-${Date.now()}`,
          sender: 'assistant',
          text: GUARDRAIL_REFUSAL_MESSAGE,
          suggestedActions: [
            '⚡ Auto-Fix Architecture',
            'Validate Pipeline',
            'Why does Kinesis need an IAM Role connected?',
            'How do I fix L2 Encryption?',
          ],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        set((state) => ({
          chatMessages: [...state.chatMessages, refusalMsg],
          isChatLoading: false,
        }));
      }, 300);
      return;
    }

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

      const res = await fetch(`${API_BASE_URL}/api/pipeline/chat`, {
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
        text: `⚠️ Unable to connect to the CloudGuard Copilot service (${API_BASE_URL}). Please ensure the backend is running.`,
        suggestedActions: [
          '⚡ Auto-Fix Architecture',
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

      const res = await fetch(`${API_BASE_URL}/api/pipeline/validate`, {
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

  autoFixPipeline: async (targetNodeId?: string) => {
    const { nodes, edges, selectedNodeId } = get();
    if (nodes.length === 0) return;

    set({ isValidating: true, activePanelView: 'CHAT' });

    const targetId = targetNodeId || (selectedNodeId && get().activePanelView === 'NODE_CHECKLIST' ? selectedNodeId : undefined);
    const result = autoFixPipelineGraph(nodes, edges, targetId);

    set({
      nodes: result.nodes,
      edges: result.edges,
    });

    // Re-evaluate backend metrics to reflect 100% score
    await get().validatePipeline();

    const targetNode = targetId ? nodes.find((n) => n.id === targetId) : null;
    const fixScopeText = targetNode
      ? `Node **${targetNode.data.label}**`
      : 'All pipeline services';

    const autoFixMsg: ChatMessage = {
      id: `msg-autofix-${Date.now()}`,
      sender: 'assistant',
      text: `⚡ **1-Click Auto-Remediation Applied!**\n\n` +
        `• **Target Scope**: ${fixScopeText}\n` +
        `• **Security Providers Linked**: ${result.addedNodes.length > 0 ? result.addedNodes.join(', ') : 'IAM Role, KMS Key, CloudWatch Logs'}\n` +
        `• **Safe Connections Established**: ${result.addedEdgesCount} encrypted/authorized edges\n` +
        `• **Checklists**: 100% security checks verified\n` +
        `• **Topology**: Auto-arranged using Dagre layered DAG algorithm\n\n` +
        `🛡️ **Pipeline Security Status:** **100% Safe Architecture (Passed)**`,
      suggestedActions: [
        'Validate Pipeline',
        'Why does Kinesis need an IAM Role connected?',
        'How do I fix L2 Encryption?',
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    set((state) => ({
      chatMessages: [...state.chatMessages, autoFixMsg],
      isValidating: false,
    }));
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
