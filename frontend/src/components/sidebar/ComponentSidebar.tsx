'use client';

import React, { useCallback, useRef, useState } from 'react';
import { getSidebarGroups } from '@/lib/nodeRegistry';
import { PaletteItem } from './PaletteItem';

const MIN_WIDTH = 180;
const MAX_WIDTH = 380;
const DEFAULT_WIDTH = 220;

export const ComponentSidebar: React.FC = () => {
  const groups = getSidebarGroups();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = ev.clientX - startX;
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
  }, [width]);

  return (
    <aside
      className="relative border-r border-white/8 bg-[#121212] overflow-y-auto flex flex-col gap-4 shrink-0 custom-scrollbar select-none"
      style={{ width }}
    >
      {/* Content */}
      <div className="p-3 flex flex-col gap-4 flex-1">
        <div className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase flex items-center justify-between">
          <span>AWS Services</span>
          <span className="text-[10px] text-gray-500 font-normal normal-case">Drag to add</span>
        </div>

        {groups.map((group) => (
          <div key={group.category} className="flex flex-col gap-2">
            <div className="text-[10px] font-medium tracking-wider text-gray-500 uppercase border-b border-white/5 pb-1">
              {group.category}
            </div>
            <div className="flex flex-col gap-1.5">
              {group.items.map((item) => (
                <PaletteItem key={item.type} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Drag-to-resize handle on right edge */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-10 group flex items-center justify-center"
        title="Drag to resize sidebar"
      >
        {/* Thin visible indicator line */}
        <div className="w-px h-full bg-white/8 group-hover:bg-blue-500/60 group-hover:w-[3px] transition-all duration-150" />
      </div>
    </aside>
  );
};
