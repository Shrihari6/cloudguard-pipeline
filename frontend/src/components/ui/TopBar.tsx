import React from 'react';
import { usePipelineStore } from '@/hooks/usePipelineStore';

export const TopBar: React.FC = () => {
  const { clearCanvas, triggerAutoLayout, nodes } = usePipelineStore();

  return (
    <header className="h-[48px] px-4 border-b border-black/10 dark:border-white/10 bg-[var(--color-bg-primary,#ffffff)] flex items-center justify-between shadow-2xs z-20">
      {/* Left branding */}
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
          CG
        </div>
        <h1 className="text-sm font-semibold tracking-tight text-[var(--color-text-primary,#1a1a18)]">
          CloudGuard Pipeline
        </h1>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          Phase 2 Active
        </span>
      </div>

      {/* Center status info */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Nodes on Canvas: <span className="font-medium text-gray-800 dark:text-gray-200">{nodes.length}</span>
      </div>

      {/* Right Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={triggerAutoLayout}
          disabled={nodes.length === 0}
          title="Rearrange canvas nodes using Dagre auto-layout"
          className="px-3 py-1 text-xs rounded border border-gray-700 hover:bg-gray-800 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          Auto Layout
        </button>
        <button
          onClick={clearCanvas}
          disabled={nodes.length === 0}
          className="px-3 py-1 text-xs rounded border border-gray-700 hover:bg-gray-800 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          Clear Canvas
        </button>
        <button
          onClick={() => alert('Validation engine will trigger in Phase 7!')}
          className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs transition-colors"
        >
          Validate Pipeline
        </button>
      </div>
    </header>
  );
};
