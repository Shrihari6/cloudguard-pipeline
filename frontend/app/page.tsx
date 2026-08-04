'use client';

import dynamic from 'next/dynamic';
import { TopBar } from '@/components/ui/TopBar';
import { ComponentSidebar } from '@/components/sidebar/ComponentSidebar';
import { AgentPanel } from '@/components/agent/AgentPanel';

// Dynamically import PipelineCanvas with ssr disabled to avoid React Flow SSR hydration/provider mismatch
const PipelineCanvas = dynamic(
  () => import('@/components/canvas/PipelineCanvas').then((mod) => mod.PipelineCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-400 text-xs">
        Loading canvas...
      </div>
    ),
  }
);

export default function Home() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--color-bg-secondary,#f5f5f0)]">
      <TopBar />
      <div className="flex flex-1 overflow-hidden relative">
        <ComponentSidebar />
        <main className="flex-1 relative h-full">
          <PipelineCanvas />
        </main>
        <AgentPanel />
      </div>
    </div>
  );
}
