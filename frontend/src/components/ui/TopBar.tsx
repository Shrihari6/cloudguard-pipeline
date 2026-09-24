import React from 'react';
import { usePipelineStore } from '@/hooks/usePipelineStore';

export const TopBar: React.FC = () => {
  const {
    clearCanvas,
    triggerAutoLayout,
    autoFixPipeline,
    nodes,
    isValidating,
    metricsResponse,
    sendChatMessage,
    isChatLoading,
    setActivePanelView,
  } = usePipelineStore();

  const totalPassed = metricsResponse?.totalPassedChecks ?? 0;
  const totalPossible = metricsResponse?.totalPossibleChecks ?? 0;
  const scorePercent = metricsResponse?.overallScorePercentage ?? 0;

  const handleValidate = async () => {
    setActivePanelView('CHAT');
    await sendChatMessage('System: Validating current pipeline topology...', true);
  };

  const handleAutoFix = async () => {
    await autoFixPipeline();
  };

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
          AI Copilot Active
        </span>
      </div>

      {/* Center status info + Score Badge */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div>
          Nodes: <span className="font-medium text-gray-800 dark:text-gray-200">{nodes.length}</span>
        </div>

        {/* Global Overview Score Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
            scorePercent === 100
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-xs'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}
          title={`Overall Security Posture Score: ${scorePercent}%`}
        >
          <span>{totalPassed} / {totalPossible} 🛡️</span>
          <span className={`text-[10px] ${scorePercent === 100 ? 'text-emerald-300' : 'text-blue-300/80'}`}>
            ({scorePercent}%)
          </span>
        </div>
      </div>

      {/* Right Action buttons */}
      <div className="flex items-center gap-2">
        {/* ⚡ Auto-Fix 100% Safe Architecture Button */}
        <button
          onClick={handleAutoFix}
          disabled={nodes.length === 0 || isValidating || isChatLoading}
          title="Automatically link IAM, KMS, & CloudWatch and rearrange to 100% safe architecture"
          className="px-3 py-1 text-xs rounded-md bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-blue-500/20 hover:from-amber-500/30 hover:via-emerald-500/30 hover:to-blue-500/30 border border-amber-500/40 hover:border-emerald-400/60 text-amber-200 hover:text-white font-semibold transition-all shadow-xs hover:shadow-emerald-900/20 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <span className="text-amber-400 animate-pulse">⚡</span>
          <span>Auto-Fix</span>
        </button>

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
          onClick={handleValidate}
          disabled={isValidating || isChatLoading || nodes.length === 0}
          className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
          title="Validate live canvas and get instant AI security breakdown"
        >
          {(isValidating || isChatLoading) && (
            <span className="w-2.5 h-2.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          )}
          <span>{isValidating || isChatLoading ? 'Validating...' : 'Validate Pipeline'}</span>
        </button>
      </div>
    </header>
  );
};
