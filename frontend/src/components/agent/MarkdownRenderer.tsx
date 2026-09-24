import React, { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
}

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayLang = language ? language.toUpperCase() : 'CODE';

  return (
    <div className="my-2.5 rounded-lg border border-white/10 bg-[#0d1117] overflow-hidden shadow-md group">
      {/* Code Block Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-white/5 text-[10px] text-gray-400 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500/80 inline-block" />
          <span className="font-semibold text-gray-300">{displayLang}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <span className="text-emerald-400 font-bold">✓</span>
              <span className="text-emerald-300 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <span>📋</span>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className="p-3 text-[11px] font-mono leading-relaxed text-blue-100 overflow-x-auto custom-scrollbar selection:bg-blue-500/30">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // Split content into blocks: Code blocks (```lang ... ```) vs Regular text blocks
  const blocks: Array<{ type: 'code' | 'text'; language?: string; content: string }> = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      blocks.push({ type: 'text', content: textBefore });
    }
    blocks.push({
      type: 'code',
      language: match[1]?.trim() || 'bash',
      content: match[2]?.trim() || '',
    });
    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText.trim()) {
    blocks.push({ type: 'text', content: remainingText });
  }

  // Parse inline elements (bold, code, links, LaTeX math variables)
  const parseInline = (text: string): React.ReactNode => {
    if (!text) return null;

    // Tokens: `code`, **bold**, *italic*, $math$
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\$[^$]+\$)/g);

    return parts.map((part, idx) => {
      if (!part) return null;

      // Inline code `code`
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded bg-black/50 text-sky-300 font-mono text-[11px] border border-white/10 shadow-2xs inline-block my-0.5"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // Bold **bold**
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={idx} className="font-semibold text-gray-100">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // Italic *italic*
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em key={idx} className="italic text-gray-300">
            {part.slice(1, -1)}
          </em>
        );
      }

      // LaTeX Math variable $x$
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        return (
          <span
            key={idx}
            className="font-serif italic text-amber-300 px-1 py-0.5 bg-amber-500/10 rounded border border-amber-500/20 text-[11px]"
          >
            {part.slice(1, -1)}
          </span>
        );
      }

      return <span key={idx}>{part}</span>;
    });
  };

  // Helper to split a table row into cells
  const parseTableRow = (rowStr: string): string[] => {
    let line = rowStr.trim();
    if (line.startsWith('|')) line = line.substring(1);
    if (line.endsWith('|')) line = line.substring(0, line.length - 1);
    return line.split('|').map((c) => c.trim());
  };

  const isTableSeparator = (rowStr: string): boolean => {
    const trimmed = rowStr.trim();
    return /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(trimmed) ||
           /^[-:\s|]+$/.test(trimmed) && trimmed.includes('-') && trimmed.includes('|');
  };

  // Render text block with headers, lists, tables, blockquotes, checklists
  const renderTextBlock = (text: string, blockKey: number) => {
    const rawLines = text.split('\n');
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        elements.push(<div key={`empty-${i}`} className="h-1.5" />);
        continue;
      }

      // Check if this line is the start of a Markdown Table
      if (trimmed.includes('|') && i + 1 < rawLines.length && isTableSeparator(rawLines[i + 1])) {
        const headers = parseTableRow(trimmed);
        i++; // skip header

        // skip separator line (and any consecutive separator)
        while (i < rawLines.length && isTableSeparator(rawLines[i])) {
          i++;
        }

        const rows: string[][] = [];
        while (i < rawLines.length && rawLines[i].trim().includes('|') && !rawLines[i].trim().startsWith('```')) {
          rows.push(parseTableRow(rawLines[i]));
          i++;
        }
        i--; // back up one line because for-loop will increment

        elements.push(
          <div
            key={`table-${i}`}
            className="my-3 w-full overflow-x-auto rounded-lg border border-white/10 bg-[#0d1117] shadow-sm custom-scrollbar"
          >
            <table className="w-full text-left text-xs border-collapse min-w-[320px]">
              <thead>
                <tr className="bg-[#161b22] border-b border-white/10">
                  {headers.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className="px-3 py-2 text-[10.5px] font-bold text-blue-300 uppercase tracking-wider whitespace-nowrap"
                    >
                      {parseInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-white/[0.03] transition-colors odd:bg-transparent even:bg-white/[0.015]"
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-3 py-2 text-[11px] text-gray-300 leading-relaxed align-top"
                      >
                        {parseInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      // Headers (#, ##, ###)
      if (line.startsWith('# ')) {
        elements.push(
          <h3 key={i} className="font-bold text-sm text-gray-100 mt-2.5 mb-1 pb-1 border-b border-white/10 flex items-center gap-1.5">
            <span className="text-blue-400">#</span>
            <span>{parseInline(line.replace(/^#\s+/, ''))}</span>
          </h3>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h4 key={i} className="font-bold text-xs text-blue-300 mt-2 mb-1 flex items-center gap-1.5">
            <span className="text-blue-400">##</span>
            <span>{parseInline(line.replace(/^##\s+/, ''))}</span>
          </h4>
        );
        continue;
      }
      if (line.startsWith('### ') || line.startsWith('#### ')) {
        elements.push(
          <h5 key={i} className="font-semibold text-xs text-blue-200 mt-1.5 mb-0.5 flex items-center gap-1">
            <span className="text-blue-400">▸</span>
            <span>{parseInline(line.replace(/^#+\s+/, ''))}</span>
          </h5>
        );
        continue;
      }

      // Blockquotes (> text)
      if (line.startsWith('> ')) {
        elements.push(
          <div
            key={i}
            className="pl-3 py-1 my-1 border-l-2 border-blue-500/60 bg-blue-500/5 text-gray-300 text-xs italic rounded-r"
          >
            {parseInline(line.replace(/^>\s*/, ''))}
          </div>
        );
        continue;
      }

      // Numbered step items (1. 2. 3.)
      const numberedMatch = line.match(/^(\d+)\.\s*(.*)$/);
      if (numberedMatch) {
        elements.push(
          <div key={i} className="flex items-start gap-2 my-1 text-xs text-gray-200">
            <span className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              {numberedMatch[1]}
            </span>
            <div className="flex-1 leading-relaxed">
              {parseInline(numberedMatch[2])}
            </div>
          </div>
        );
        continue;
      }

      // Checklist items (✅ / ❌ or - [ ] / - [x])
      if (line.startsWith('✅') || line.startsWith('❌') || line.startsWith('✓') || line.startsWith('✕')) {
        const isPass = line.startsWith('✅') || line.startsWith('✓');
        const content = line.replace(/^[✅❌✓✕]\s*/, '');
        elements.push(
          <div key={i} className="flex items-center gap-2 my-0.5 text-xs text-gray-200">
            <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${isPass ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60' : 'bg-rose-950/80 text-rose-400 border border-rose-700/60'}`}>
              {isPass ? '✓' : '✕'}
            </span>
            <span>{parseInline(content)}</span>
          </div>
        );
        continue;
      }

      // Bullet points (•, -, *)
      if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
        const content = line.replace(/^[•\-*]\s*/, '');
        elements.push(
          <div key={i} className="flex items-start gap-2 ml-1 my-0.5 text-xs text-gray-300">
            <span className="text-blue-400 font-bold shrink-0 text-[10px] mt-0.5">•</span>
            <span className="leading-relaxed">{parseInline(content)}</span>
          </div>
        );
        continue;
      }

      // Regular paragraph
      elements.push(
        <p key={i} className="text-xs text-gray-300 leading-relaxed my-0.5">
          {parseInline(line)}
        </p>
      );
    }

    return (
      <div key={blockKey} className="flex flex-col gap-1">
        {elements}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1 text-gray-200">
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return <CodeBlock key={idx} language={block.language || 'bash'} code={block.content} />;
        }
        return renderTextBlock(block.content, idx);
      })}
    </div>
  );
};
