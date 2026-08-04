import { Edge, Node } from 'reactflow';
import dagre from 'dagre';
import { PipelineNodeData } from '@/types';

const NODE_WIDTH = 150;
const NODE_HEIGHT = 90;

export function layoutPipeline(
  nodes: Node<PipelineNodeData>[],
  edges: Edge[]
): Node<PipelineNodeData>[] {
  if (nodes.length === 0) return [];

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to Dagre
  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      x: node.position.x,
      y: node.position.y,
    });
  });

  // Add edges to Dagre
  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  // Layout calculations
  dagre.layout(g);

  // Apply positions back to unpinned nodes
  return nodes.map((node) => {
    // If the user manually dragged this node, preserve its position
    if (node.data?.isManuallyPositioned) {
      return node;
    }

    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;

    // Dagre uses center anchor coordinates, React Flow uses top-left
    return {
      ...node,
      position: {
        x: dagreNode.x - NODE_WIDTH / 2,
        y: dagreNode.y - NODE_HEIGHT / 2,
      },
    };
  });
}
