import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePipelineStore } from '@/hooks/usePipelineStore';
import { MarkdownRenderer } from './MarkdownRenderer';

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 360;

const DEFAULT_QUICK_ACTIONS = [
  '⚡ Auto-Fix Architecture',
  'Why did my score drop?',
  'How do I fix L2 Encryption?',
  'Explain KMS Key Policy',
  'Why does Kinesis need an IAM Role connected?',
];

export const InspectorPanel: React.FC = () => {
  const {
    activePanelView,
    setActivePanelView,
    getSelectedNode,
    toggleSecurityCheck,
    metricsResponse,
    isValidating,
    validatePipeline,
    autoFixPipeline,
    chatMessages,
    isChatLoading,
    sendChatMessage,
  } = usePipelineStore();

  const selectedNode = getSelectedNode();

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [inputPrompt, setInputPrompt] = useState('');
  const isDragging = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  // Handle panel width resizing
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;

      const startX = e.clientX;
      const startWidth = width;

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
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

  const totalPassed = metricsResponse?.totalPassedChecks ?? 0;
  const totalPossible = metricsResponse?.totalPossibleChecks ?? 0;
  const scorePercent = metricsResponse?.overallScorePercentage ?? 0;
  const failedChecksCount = Math.max(0, totalPossible - totalPassed);

  const selectedNodeMetrics = selectedNode
    ? metricsResponse?.nodeMetricsList.find((m) => m.nodeId === selectedNode.id)
    : null;

  const handleSend = () => {
    if (!inputPrompt.trim() || isChatLoading) return;
    const msg = inputPrompt.trim();
    setInputPrompt('');
    sendChatMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleActionClick = (action: string) => {
    if (isChatLoading) return;
    sendChatMessage(action);
  };

  return (
    <aside
      className="relative border-l border-white/10 bg-[#121214] flex flex-col shrink-0 overflow-hidden shadow-2xl transition-colors"
      style={{ width }}
    >
      {/* Left-edge drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 left-0 w-2 h-full cursor-col-resize z-20 group flex items-center justify-center"
        title="Drag to resize AI Copilot"
      >
        <div className="w-0.5 h-full bg-transparent group-hover:bg-blue-500/70 group-hover:w-1 transition-all duration-150" />
      </div>

      {/* TOP SECTION: Active Score Badge & Compliance Summary */}
      <div className="px-3.5 py-3 border-b border-white/10 bg-[#18181c]/90 backdrop-blur-md shrink-0 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-xs">
              <span className="text-xs">🤖</span>
            </div>
            <div>
              <h2 className="text-xs font-bold text-gray-100 tracking-tight flex items-center gap-1.5">
                CloudGuard AI Copilot
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </h2>
              <p className="text-[10px] text-gray-400">Canvas-Aware Security Agent</p>
            </div>
          </div>

          {/* Active Score Badge: e.g. 3/3 🛡️ */}
          <div className="flex items-center gap-2">
            {isValidating && (
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" title="Validating canvas..." />
            )}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold border transition-colors shadow-xs ${
                totalPossible === 0
                  ? 'bg-zinc-800/80 text-gray-400 border-white/10'
                  : scorePercent >= 80
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 shadow-emerald-950/20'
                  : scorePercent >= 50
                  ? 'bg-amber-950/60 text-amber-300 border-amber-700/60 shadow-amber-950/20'
                  : 'bg-rose-950/60 text-rose-300 border-rose-700/60 shadow-rose-950/20'
              }`}
              title={`${totalPassed} passed out of ${totalPossible} applicable security checks (${scorePercent}%)`}
            >
              <span>{totalPassed}/{totalPossible} 🛡️</span>
              <span className="text-[10px] opacity-80">({scorePercent}%)</span>
            </div>
          </div>
        </div>

        {/* Quick Summary of Current Pass/Fail Counts */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-gray-300 font-medium">Passed:</span>
            <span className="font-mono font-bold text-emerald-300">{totalPassed}</span>
          </div>

          <div className="h-3 w-px bg-white/10" />

          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${failedChecksCount > 0 ? 'bg-rose-400' : 'bg-gray-500'}`}
            />
            <span className="text-gray-300 font-medium">Failed:</span>
            <span
              className={`font-mono font-bold ${
                failedChecksCount > 0 ? 'text-rose-400' : 'text-gray-400'
              }`}
            >
              {failedChecksCount}
            </span>
          </div>

          <div className="h-3 w-px bg-white/10" />

          <button
            onClick={() => validatePipeline()}
            disabled={isValidating}
            className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
          >
            {isValidating ? 'Validating...' : 'Re-check'}
          </button>
        </div>

        {/* View Switcher: Copilot vs Inspector (when node is selected) */}
        {selectedNode && (
          <div className="flex items-center p-0.5 rounded-lg bg-black/50 border border-white/5">
            <button
              onClick={() => setActivePanelView('CHAT')}
              className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                activePanelView === 'CHAT'
                  ? 'bg-blue-600/90 text-white shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              💬 Copilot
            </button>
            <button
              onClick={() => setActivePanelView('NODE_CHECKLIST')}
              className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activePanelView === 'NODE_CHECKLIST'
                  ? 'bg-blue-600/90 text-white shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: selectedNode.data.color }}
              />
              <span className="truncate max-w-[120px]">{selectedNode.data.label}</span>
            </button>
          </div>
        )}
      </div>

      {/* MIDDLE SECTION: Scrollable Content (Chatbot or Node Inspector) */}
      {activePanelView === 'NODE_CHECKLIST' && selectedNode ? (
        /* Node Inspector Detail View */
        <div className="flex-1 p-3 overflow-y-auto custom-scrollbar flex flex-col gap-3">
          <div className="p-3 rounded-xl border border-white/10 bg-zinc-900/90 shadow-md">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-extrabold text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: selectedNode.data.color }}
                >
                  {selectedNode.data.abbrev}
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-gray-100">
                    {selectedNode.data.label}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-mono">{selectedNode.id}</p>
                </div>
              </div>
              {selectedNodeMetrics && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                    selectedNodeMetrics.score >= 80
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                      : selectedNodeMetrics.score >= 50
                      ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                      : 'bg-rose-950/60 text-rose-400 border-rose-800'
                  }`}
                >
                  {selectedNodeMetrics.score}% Score
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {selectedNode.data.desc}
            </p>

            <div className="flex items-center gap-1.5 mt-2.5">
              <button
                onClick={() => autoFixPipeline(selectedNode.id)}
                disabled={isValidating || isChatLoading}
                className="flex-1 py-1.5 text-[10px] font-semibold text-amber-200 hover:text-white bg-gradient-to-r from-amber-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 border border-amber-500/40 hover:border-emerald-400/60 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                title="Automatically attach required IAM, KMS, or CloudWatch connections to make this node 100% compliant"
              >
                <span className="text-amber-400 animate-pulse">⚡</span>
                <span>Auto-Fix Node</span>
              </button>

              <button
                onClick={() => {
                  setActivePanelView('CHAT');
                  sendChatMessage(`Explain security compliance for ${selectedNode.data.label} (${selectedNode.data.type}) on the canvas.`);
                }}
                className="flex-1 py-1.5 text-[10px] font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>💬 Ask Copilot</span>
              </button>
            </div>
          </div>

          {/* 3-Layer Metrics */}
          {selectedNodeMetrics && (
            <div className="flex flex-col gap-2">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                3-Layer Posture Checks
              </h4>
              <div className="p-2.5 rounded-lg border border-white/5 bg-zinc-900/70 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-200">
                    L1 — IAM Identity Control
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      selectedNodeMetrics.layer1Identity.isPassed
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {selectedNodeMetrics.layer1Identity.isPassed ? '✓ Pass' : '✕ Fail'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 leading-tight">
                  {selectedNodeMetrics.layer1Identity.description}
                </p>
              </div>

              <div className="p-2.5 rounded-lg border border-white/5 bg-zinc-900/70 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-200">
                    L2 — Encryption at Rest (KMS)
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      selectedNodeMetrics.layer2Encryption.isPassed
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {selectedNodeMetrics.layer2Encryption.isPassed ? '✓ Pass' : '✕ Fail'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 leading-tight">
                  {selectedNodeMetrics.layer2Encryption.description}
                </p>
              </div>

              <div className="p-2.5 rounded-lg border border-white/5 bg-zinc-900/70 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-200">
                    L3 — Observability (CloudWatch)
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      selectedNodeMetrics.layer3Logging.isPassed
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {selectedNodeMetrics.layer3Logging.isPassed ? '✓ Pass' : '✕ Fail'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 leading-tight">
                  {selectedNodeMetrics.layer3Logging.description}
                </p>
              </div>
            </div>
          )}

          {/* Manual controls checklist */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Manual Verification Checks
            </h4>
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
                  <span className="text-xs font-medium text-gray-200">{chk.label}</span>
                  <span className="text-[10px] text-gray-500 leading-tight mt-0.5">
                    {chk.description}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      ) : (
        /* Chatbot Message Stream View */
        <div className="flex-1 p-3.5 overflow-y-auto custom-scrollbar flex flex-col gap-3.5">
          {chatMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isSystem = msg.sender === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-1">
                  <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] font-medium flex items-center gap-1.5 shadow-xs">
                    <span>⚡</span>
                    <span>{msg.text}</span>
                    {msg.timestamp && (
                      <span className="text-[9px] text-blue-400/60 font-mono">
                        {msg.timestamp}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}
              >
                {/* Sender label and timestamp */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-gray-400 font-mono">
                  <span>{isUser ? 'You' : 'Security Copilot'}</span>
                  {msg.timestamp && <span className="text-[9px] text-gray-600">· {msg.timestamp}</span>}
                </div>

                {/* Message bubble */}
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[92%] transition-all ${
                    isUser
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-xs shadow-md border border-blue-400/30'
                      : 'bg-zinc-900/90 text-gray-200 rounded-tl-xs shadow-lg border border-white/10 backdrop-blur-md'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <MarkdownRenderer content={msg.text} />
                  )}

                  {/* Contextual Suggested Actions inside assistant message */}
                  {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap gap-1.5">
                      <span className="w-full text-[10px] font-semibold text-gray-400 tracking-wider uppercase">
                        Recommended Actions:
                      </span>
                      {msg.suggestedActions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleActionClick(action)}
                          className="px-2 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 hover:text-blue-200 border border-blue-500/30 text-[10px] font-medium transition-all text-left flex items-center gap-1 cursor-pointer"
                        >
                          <span className="text-blue-400 font-bold">↳</span>
                          <span>{action}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isChatLoading && (
            <div className="flex flex-col items-start max-w-full">
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-gray-400 font-mono">
                <span>Security Copilot</span>
                <span className="text-[9px] text-gray-600">· analyzing...</span>
              </div>
              <div className="p-3 rounded-2xl rounded-tl-xs bg-zinc-900/90 border border-white/10 flex items-center gap-2 text-xs text-gray-400 shadow-md">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span className="text-[11px] text-gray-400">Evaluating canvas topology & 3-layer checks...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* BOTTOM SECTION: Quick-action Chips & Text Input Field */}
      <div className="p-3 border-t border-white/10 bg-[#161619] shrink-0 flex flex-col gap-2.5">
        {/* Quick-action chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {DEFAULT_QUICK_ACTIONS.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleActionClick(action)}
              disabled={isChatLoading}
              className="px-2.5 py-1 rounded-full bg-zinc-800/90 hover:bg-zinc-700/90 disabled:opacity-50 text-gray-300 hover:text-white border border-white/10 text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs shrink-0"
            >
              {action}
            </button>
          ))}
        </div>

        {/* Input box and send button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isChatLoading}
              placeholder="Ask about compliance, security checks..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-900 border border-white/15 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-100 placeholder-gray-500 transition-all shadow-inner"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputPrompt.trim() || isChatLoading}
            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center transition-all shadow-md cursor-pointer shrink-0"
            title="Send query to Security Copilot"
          >
            <svg
              className="w-4 h-4 translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between text-[9px] text-gray-500">
          <span>Real-time canvas context enabled</span>
          <span>NIST SP 800-53 · CIS AWS</span>
        </div>
      </div>
    </aside>
  );
};
