import { useState } from 'react';
import type { ToolTrace } from '../../services/agentApi';

interface Props {
  traces: ToolTrace[];
}

function TraceItem({ trace }: { trace: ToolTrace }) {
  const [expanded, setExpanded] = useState(false);

  const copyJson = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const formatJson = (raw: string) => {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded mb-1 text-xs">
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-gray-400">{expanded ? '▼' : '▶'}</span>
        <span className="font-mono text-blue-600 dark:text-blue-400">{trace.toolName}</span>
        <span className="ml-auto text-gray-400">{trace.durationMs}ms</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500 uppercase tracking-wide" style={{ fontSize: '10px' }}>Input</span>
              <button
                onClick={() => copyJson(trace.inputJson)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
              >
                Copy JSON
              </button>
            </div>
            <pre className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 overflow-x-auto text-green-700 dark:text-green-400 whitespace-pre-wrap break-all">
              {formatJson(trace.inputJson)}
            </pre>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500 uppercase tracking-wide" style={{ fontSize: '10px' }}>Output</span>
              <button
                onClick={() => copyJson(trace.outputJson)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
              >
                Copy JSON
              </button>
            </div>
            <pre className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 overflow-x-auto text-blue-700 dark:text-blue-400 whitespace-pre-wrap break-all">
              {formatJson(trace.outputJson)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ToolTraceAccordion({ traces }: Props) {
  if (traces.length === 0) return null;

  return (
    <div className="mt-2">
      {traces.map((trace, i) => (
        <TraceItem key={i} trace={trace} />
      ))}
    </div>
  );
}
