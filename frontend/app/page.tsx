'use client';

import dynamic from 'next/dynamic';
import { TopBar } from '@/components/ui/TopBar';
import { ComponentSidebar } from '@/components/sidebar/ComponentSidebar';
import { AgentPanel } from '@/components/agent/AgentPanel';

const PipelineCanvas = dynamic(
  () => import('@/components/canvas/PipelineCanvas').then((mod) => mod.PipelineCanvas),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
        Loading canvas...
      </div>
    ),
  }
);

export default function Home() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <ComponentSidebar />
        <main className="flex-1 relative h-full">
          <PipelineCanvas />
        </main>
        <AgentPanel />
      </div>
    </div>
  );
}