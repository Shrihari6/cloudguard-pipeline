import React, { memo } from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import { PipelineNodeData } from '@/types';
import { SecurityStrip } from './SecurityStrip';
import { usePipelineStore } from '@/hooks/usePipelineStore';

export const PipelineNode = memo(({ id, data, selected }: NodeProps<PipelineNodeData>) => {
  const removeNode = usePipelineStore((state) => state.removeNode);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeNode(id);
  };

  return (
    <div
      className={`relative w-[140px] max-w-[140px] p-2 rounded-lg border backdrop-blur-md transition-all duration-200 bg-zinc-900/90 text-gray-100 ${
        selected
          ? 'border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.4)] scale-[1.02]'
          : 'border-white/10 hover:border-white/25 hover:shadow-sm'
      }`}
    >
      {/* Top Target Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-blue-400 hover:!bg-blue-300 !border-2 !border-zinc-900 transition-all hover:ring-2 hover:ring-blue-500/50"
      />

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        title="Remove service node"
        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-800 hover:bg-red-500 hover:text-white text-gray-400 text-[10px] font-bold leading-none flex items-center justify-center border border-white/10 transition-colors shadow-xs z-10 cursor-pointer"
      >
        ×
      </button>

      {/* Header: Icon badge & Abbrev */}
      <div className="flex items-center gap-1.5 mb-1">
        <div
          className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white shadow-xs shrink-0"
          style={{ backgroundColor: data.color }}
        >
          {data.abbrev}
        </div>
        <span className="text-[11px] font-semibold tracking-tight text-gray-200 truncate leading-none">
          {data.label}
        </span>
      </div>

      {/* Node Description */}
      <p className="text-[9.5px] leading-tight text-gray-400 line-clamp-2 min-h-[18px]">
        {data.desc}
      </p>

      {/* Security Check Status Strip */}
      <SecurityStrip checks={data.checks || []} />

      {/* Bottom Source Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-blue-400 hover:!bg-blue-300 !border-2 !border-zinc-900 transition-all hover:ring-2 hover:ring-blue-500/50"
      />
    </div>
  );
});

PipelineNode.displayName = 'PipelineNode';
