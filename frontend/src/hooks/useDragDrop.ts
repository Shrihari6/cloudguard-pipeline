import { DragEvent, useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import { NodeType } from '@/types';
import { NODE_REGISTRY } from '@/lib/nodeRegistry';
import { usePipelineStore } from '@/hooks/usePipelineStore';

export function useDragDrop() {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = usePipelineStore((state) => state.addNode);

  const onDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>, nodeType: NodeType) => {
      event.dataTransfer.setData('application/reactflow', nodeType);
      event.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;

      if (!type || !NODE_REGISTRY[type]) {
        return;
      }

      // Convert pixel position on screen to React Flow canvas position
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position, 'user');
    },
    [screenToFlowPosition, addNode]
  );

  return {
    onDragStart,
    onDragOver,
    onDrop,
  };
}
