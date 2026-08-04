import React, { useCallback, useRef, useState } from 'react';
import { usePipelineStore } from '@/hooks/usePipelineStore';

const MIN_WIDTH = 220;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 280;

export const AgentPanel: React.FC = () => {
  const { activePanelView, getSelectedNode, toggleSecurityCheck, getSecuritySummary } =
    usePipelineStore();

  const selectedNode = getSelectedNode();
  const summary = getSecuritySummary();

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;

      const startX = e.clientX;
      const startWidth = width;

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        // Panel is on the right so dragging left (negative delta) = expanding
        const delta = startX - ev.clientX;
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
        setWidth(newWidth);
      };

      const onMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [width]
  );

  return (
    <aside
      className="relative border-l border-white/8 bg-[#121212] flex flex-col shrink-0 overflow-hidden"
      style={{ width }}
    >
      {/* Left-edge drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize z-10 group flex items-center justify-center"
        title="Drag to resize panel"
      >
        <div className="w-px h-full bg-white/8 group-hover:bg-blue-500/60 group-hover:w-[3px] transition-all duration-150" />
      </div>

      {/* Header */}
      <div className="pl-2 pr-3 py-3 border-b border-white/8 bg-[#1a1a1a] flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xs font-semibold text-gray-200">
            {activePanelView === 'NODE_CHECKLIST' && selectedNode
              ? 'Node Security Checklist'
              : 'Security Posture'}
          </h2>
          <p className="text-[10px] text-gray-500">
            {activePanelView === 'NODE_CHECKLIST' && selectedNode
              ? selectedNode.data.label
              : 'Global Overview'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-gray-300 border border-white/5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{summary.checked}/{summary.total}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
        {activePanelView === 'NODE_CHECKLIST' && selectedNode ? (
          <div className="flex flex-col gap-3">
            {/* Node identity card */}
            <div className="p-2.5 rounded-lg border border-white/8 bg-zinc-900/80">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ backgroundColor: selectedNode.data.color }}
                >
                  {selectedNode.data.abbrev}
                </span>
                <span className="text-xs font-medium text-gray-200">
                  {selectedNode.data.label}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                {selectedNode.data.desc}
              </p>
            </div>

            {/* Security checks */}
            <div className="flex flex-col gap-1.5">
              <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Security Controls
              </h3>
              {selectedNode.data.checks.map((chk) => (
                <label
                  key={chk.id}
                  className="flex items-start gap-2.5 p-2 rounded-md border border-white/5 bg-zinc-900/60 hover:bg-zinc-800/80 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={chk.checked}
                    onChange={() => toggleSecurityCheck(selectedNode.id, chk.id)}
                    className="mt-0.5 rounded accent-blue-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-200">
                      {chk.label}
                    </span>
                    <span className="text-[10px] text-gray-500 leading-tight mt-0.5">
                      {chk.description}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="text-3xl mb-3">🛡️</div>
            <p className="text-xs font-medium text-gray-300">
              Select a node to inspect security controls
            </p>
            <p className="text-[10px] text-gray-500 mt-1 leading-relaxed max-w-[200px]">
              Click any AWS service node on the canvas to open its 3-layer security checklist.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
