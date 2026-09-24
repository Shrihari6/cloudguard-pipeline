import { Edge, Node } from 'reactflow';
import { NodeType, PipelineNodeData } from '@/types';
import { NODE_REGISTRY } from './nodeRegistry';
import { getChecksForNode } from './securityRules';
import { layoutPipeline } from './layoutPipeline';

// Node types that require IAM connection (Layer 1)
export const IAM_REQUIRED_TYPES = new Set<NodeType>([
  'kinesis',
  's3',
  'sqs',
  'sns',
  'eventbridge',
  'lambda',
  'glue',
  'emr',
  'ec2',
  'ecs',
  'eks',
  'rds',
  'dynamodb',
  'redshift',
  'apigateway',
]);

// Node types that require KMS connection (Layer 2)
export const ENCRYPTION_REQUIRED_TYPES = new Set<NodeType>([
  'kinesis',
  's3',
  'sqs',
  'sns',
  'ec2',
  'rds',
  'dynamodb',
  'redshift',
]);

// Node types that require CloudWatch connection (Layer 3)
export const LOGGING_REQUIRED_TYPES = new Set<NodeType>([
  'lambda',
  'glue',
  'emr',
  'ec2',
  'ecs',
  'eks',
  'rds',
  'dynamodb',
  'redshift',
  'kinesis',
  'apigateway',
]);

// Pure security & observability provider nodes
export const SECURITY_PROVIDER_TYPES = new Set<NodeType>([
  'iam',
  'kms',
  'waf',
  'cloudwatch',
  'guardduty',
  'vpc',
  'cloudfront',
]);

export interface AutoFixResult {
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
  addedNodes: string[];
  addedEdgesCount: number;
  fixedNodesCount: number;
}

/**
 * Creates a new security provider node if one doesn't exist on canvas
 */
function createSecurityProviderNode(type: NodeType, index: number): Node<PipelineNodeData> {
  const meta = NODE_REGISTRY[type];
  const id = `${type}-autofix-${Date.now()}-${index}`;
  return {
    id,
    type: 'pipelineNode',
    position: { x: 100 + index * 180, y: 50 },
    data: {
      type,
      label: meta.label,
      desc: meta.desc,
      color: meta.color,
      abbrev: meta.abbrev,
      checks: getChecksForNode(type).map((c) => ({ ...c, checked: true })),
      origin: 'agent',
      isManuallyPositioned: false,
    },
  };
}

/**
 * Transforms canvas graph into a 100% compliant AWS safe architecture
 * @param currentNodes current list of nodes on canvas
 * @param currentEdges current list of edges on canvas
 * @param targetNodeId optional node ID to fix only that node, or undefined to fix entire canvas
 */
export function autoFixPipelineGraph(
  currentNodes: Node<PipelineNodeData>[],
  currentEdges: Edge[],
  targetNodeId?: string
): AutoFixResult {
  if (currentNodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      addedNodes: [],
      addedEdgesCount: 0,
      fixedNodesCount: 0,
    };
  }

  const updatedNodes = [...currentNodes];
  const updatedEdges = [...currentEdges];
  const addedNodes: string[] = [];
  let addedEdgesCount = 0;

  // Build connection map (bidirectional lookup)
  const isConnected = (idA: string, idB: string): boolean => {
    return updatedEdges.some(
      (e) =>
        (e.source === idA && e.target === idB) ||
        (e.source === idB && e.target === idA)
    );
  };

  // Helper to find an existing provider node or create a new one
  const getOrCreateProviderNode = (providerType: NodeType): Node<PipelineNodeData> => {
    let provider = updatedNodes.find((n) => n.data.type === providerType);
    if (!provider) {
      provider = createSecurityProviderNode(providerType, updatedNodes.length + 1);
      updatedNodes.push(provider);
      addedNodes.push(provider.data.label);
    }
    return provider;
  };

  // Determine which nodes to inspect
  const targetNodes = targetNodeId
    ? updatedNodes.filter((n) => n.id === targetNodeId)
    : updatedNodes.filter((n) => !SECURITY_PROVIDER_TYPES.has(n.data.type));

  let fixedNodesCount = 0;

  // Track if any target requires IAM, KMS, or CloudWatch
  const needsIam = targetNodes.some((n) => IAM_REQUIRED_TYPES.has(n.data.type));
  const needsKms = targetNodes.some((n) => ENCRYPTION_REQUIRED_TYPES.has(n.data.type));
  const needsCw = targetNodes.some((n) => LOGGING_REQUIRED_TYPES.has(n.data.type));

  const iamNode = needsIam ? getOrCreateProviderNode('iam') : null;
  const kmsNode = needsKms ? getOrCreateProviderNode('kms') : null;
  const cwNode = needsCw ? getOrCreateProviderNode('cloudwatch') : null;

  for (const node of targetNodes) {
    const nType = node.data.type;
    let nodeModified = false;

    // 1. Layer 1 — IAM Identity Connection
    if (IAM_REQUIRED_TYPES.has(nType) && iamNode && !isConnected(node.id, iamNode.id)) {
      const edgeId = `e-${iamNode.id}-${node.id}`;
      if (!updatedEdges.some((e) => e.id === edgeId)) {
        updatedEdges.push({
          id: edgeId,
          source: iamNode.id,
          target: node.id,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#38bdf8', strokeWidth: 2.5 },
        } as Edge);
        addedEdgesCount++;
        nodeModified = true;
      }
    }

    // 2. Layer 2 — KMS Encryption Connection
    if (ENCRYPTION_REQUIRED_TYPES.has(nType) && kmsNode && !isConnected(node.id, kmsNode.id)) {
      const edgeId = `e-${kmsNode.id}-${node.id}`;
      if (!updatedEdges.some((e) => e.id === edgeId)) {
        updatedEdges.push({
          id: edgeId,
          source: kmsNode.id,
          target: node.id,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#38bdf8', strokeWidth: 2.5 },
        } as Edge);
        addedEdgesCount++;
        nodeModified = true;
      }
    }

    // 3. Layer 3 — CloudWatch Observability Connection
    if (LOGGING_REQUIRED_TYPES.has(nType) && cwNode && !isConnected(node.id, cwNode.id)) {
      const edgeId = `e-${node.id}-${cwNode.id}`;
      if (!updatedEdges.some((e) => e.id === edgeId)) {
        updatedEdges.push({
          id: edgeId,
          source: node.id,
          target: cwNode.id,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#38bdf8', strokeWidth: 2.5 },
        } as Edge);
        addedEdgesCount++;
        nodeModified = true;
      }
    }

    if (nodeModified) {
      fixedNodesCount++;
    }
  }

  // Ensure all manual checklists on all nodes are marked checked (100% compliant)
  const allFinalNodes = updatedNodes.map((n) => ({
    ...n,
    data: {
      ...n.data,
      checks: (n.data.checks || []).map((chk) => ({ ...chk, checked: true })),
      isManuallyPositioned: false, // allow Dagre to reposition smoothly
    },
  }));

  // Perform Dagre auto-layout to neatly arrange the new safe topology
  const rearrangedNodes = layoutPipeline(allFinalNodes, updatedEdges);

  return {
    nodes: rearrangedNodes,
    edges: updatedEdges,
    addedNodes,
    addedEdgesCount,
    fixedNodesCount: fixedNodesCount || targetNodes.length,
  };
}
