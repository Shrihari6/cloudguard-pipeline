import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  NodeDragHandler,
  NodeMouseHandler,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { PipelineNode } from './PipelineNode';
import { EmptyHint } from './EmptyHint';
import { ThemeSwitcher } from './ThemeSwitcher';
import { usePipelineStore } from '@/hooks/usePipelineStore';
import { useDragDrop } from '@/hooks/useDragDrop';

const CanvasInner: React.FC = () => {
  const {
    nodes,
    edges,
    canvasTheme,
    onNodesChange,
    onEdgesChange,
    addEdge,
    selectNode,
    updateNodePosition,
  } = usePipelineStore();

  const { onDragOver, onDrop } = useDragDrop();

  const nodeTypes = useMemo(
    () => ({
      pipelineNode: PipelineNode,
    }),
    []
  );

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    selectNode(node.id);
  };

  const handlePaneClick = () => {
    selectNode(null);
  };

  const handleNodeDragStop: NodeDragHandler = (_, node) => {
    updateNodePosition(node.id, node.position);
  };

  // High contrast edge color depending on background theme
  const getEdgeStrokeColor = () => {
    if (canvasTheme === 'matrix') return '#00ff66';
    if (canvasTheme === 'light') return '#0284c7';
    return '#38bdf8';
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden transition-all duration-300"
      style={{
        backgroundImage: `url('/backgrounds/${canvasTheme}.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ThemeSwitcher />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={addEdge}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onNodeDragStop={handleNodeDragStop}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: getEdgeStrokeColor(),
            strokeWidth: 2.5,
          },
        }}
      >
        <Background
          gap={16}
          size={1}
          color={
            canvasTheme === 'light'
              ? 'rgba(0, 0, 0, 0.08)'
              : 'rgba(255, 255, 255, 0.08)'
          }
        />
        <Controls position="bottom-left" className="!bg-gray-900/80 !border-white/10 !text-white" />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          maskColor="rgba(0, 0, 0, 0.6)"
          className="!bg-gray-900/80 !backdrop-blur-md !border-white/15 !rounded-lg overflow-hidden shadow-lg"
        />
      </ReactFlow>

      {nodes.length === 0 && <EmptyHint />}
    </div>
  );
};

export const PipelineCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
};
