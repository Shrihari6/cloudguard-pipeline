import React, { useState, useRef, useEffect } from 'react';
import { usePipelineStore } from '@/hooks/usePipelineStore';
import { CanvasTheme } from '@/types';

export const ThemeSwitcher: React.FC = () => {
  const { canvasTheme, setCanvasTheme } = usePipelineStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const themes: Array<{ id: CanvasTheme; label: string; icon: string }> = [
    { id: 'dark', label: 'Dark', icon: '🌙' },
    { id: 'light', label: 'Light', icon: '☀️' },
    { id: 'matrix', label: 'Matrix', icon: '🟢' },
  ];

  const activeTheme = themes.find((t) => t.id === canvasTheme) || themes[0];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="absolute top-4 right-4 z-30 select-none">
      {/* Single Toggle Button showing selected theme */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#121212]/80 backdrop-blur-md border border-white/15 text-gray-200 shadow-lg hover:border-blue-400/60 hover:bg-[#1a1a1a] hover:shadow-[0_0_14px_rgba(59,130,246,0.35)] transition-all duration-200 cursor-pointer group"
      >
        <span className="text-xs group-hover:scale-110 transition-transform">{activeTheme.icon}</span>
        <span className="font-medium tracking-wide">{activeTheme.label} Theme</span>
        <span
          className={`text-[9px] text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-400' : 'group-hover:text-gray-200'
          }`}
        >
          ▼
        </span>
      </button>

      {/* Glassmorphic Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 py-1.5 rounded-xl bg-[#121212]/90 backdrop-blur-md border border-white/15 shadow-2xl flex flex-col gap-0.5 z-40">
          {themes.map((t) => {
            const isActive = canvasTheme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setCanvasTheme(t.id);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium transition-all cursor-pointer text-left mx-1 rounded-lg ${
                  isActive
                    ? 'bg-blue-600/30 text-blue-300 font-semibold border border-blue-500/40'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-xs">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
