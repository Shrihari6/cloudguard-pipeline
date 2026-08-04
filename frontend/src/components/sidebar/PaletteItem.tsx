import React, { DragEvent } from 'react';
import { NodeRegistryItem, NodeType } from '@/types';

interface PaletteItemProps {
  item: NodeRegistryItem;
}

export const PaletteItem: React.FC<PaletteItemProps> = ({ item }) => {
  const handleDragStart = (event: DragEvent<HTMLDivElement>, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, item.type)}
      className="group p-2 rounded-md border border-white/10 bg-[#181818] hover:border-blue-500/60 hover:bg-[#222222] hover:shadow-md cursor-grab active:cursor-grabbing transition-all select-none"
    >
      <div className="flex items-center gap-2 mb-0.5">
        <div
          className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0 shadow-xs"
          style={{ backgroundColor: item.color }}
        >
          {item.abbrev}
        </div>
        <span className="text-xs font-medium text-gray-200 group-hover:text-blue-400 truncate">
          {item.label}
        </span>
      </div>
      <p className="text-[10px] text-gray-400 leading-tight line-clamp-2">
        {item.desc}
      </p>
    </div>
  );
};
