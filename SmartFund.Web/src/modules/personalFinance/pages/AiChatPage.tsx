import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessageDto, ToolTrace, PendingActionSummary } from '../services/agentApi';
import { sendChatMessage } from '../services/agentApi';
import ToolTraceAccordion from '../components/chat/ToolTraceAccordion';
import ConfirmActionCard from '../components/chat/ConfirmActionCard';

// ── Message types ─────────────────────────────────────────────────────────────

interface UserMessage {
  id: string;
  type: 'user';
  content: string;
}

interface AssistantMessage {
  id: string;
  type: 'assistant';
  content: string;
  toolTraces: ToolTrace[];
  pendingAction: PendingActionSummary | null;
  pendingActionDone: boolean;
}

interface SystemMessage {
  id: string;
  type: 'system';
  content: string;
}

type ChatEntry = UserMessage | AssistantMessage | SystemMessage;

// ── Helpers ───────────────────────────────────────────────────────────────────

let idCounter = 0;
const nextId = () => `msg-${++idCounter}`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function AiChatPage() {
  const [entries, setEntries] = useState<ChatEntry[]>([
    {
      id: nextId(),
      type: 'system',
      content: 'SmartFund Assistant is ready. Ask me anything about your finances — e.g. "What are my wallet balances?" or "Can I afford a ₦600k iPhone?"'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const getHistory = (): ChatMessageDto[] => {
    const all = entries
      .filter((e): e is UserMessage | AssistantMessage => e.type === 'user' || e.type === 'assistant')
      .map(e => ({ role: e.type as 'user' | 'assistant', content: e.content }));
    // Cap at last 40 messages (~20 turns) to stay within model token limits
    return all.slice(-40);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: UserMessage = { id: nextId(), type: 'user', content: text };
    setEntries(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = getHistory();
      history.push({ role: 'user', content: text });

      const response = await sendChatMessage(history);

      const assistantMsg: AssistantMessage = {
        id: nextId(),
        type: 'assistant',
        content: response.reply,
        toolTraces: response.toolTraces,
        pendingAction: response.pendingAction,
        pendingActionDone: false,
      };
      setEntries(prev => [...prev, assistantMsg]);
    } catch (e: unknown) {
      const errMsg: SystemMessage = {
        id: nextId(),
        type: 'system',
        content: `Error: ${e instanceof Error ? e.message : 'Something went wrong. Please try again.'}`
      };
      setEntries(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const markPendingDone = (id: string, result: string) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== id || e.type !== 'assistant') return e;
      return {
        ...e,
        pendingActionDone: true,
        content: e.content + '\n\n✅ ' + result,
      } as AssistantMessage;
    }));
  };

  const markPendingCancelled = (id: string) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== id || e.type !== 'assistant') return e;
      return { ...e, pendingActionDone: true } as AssistantMessage;
    }));
  };

  return (
    <div className="flex flex-col h-full max-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
          AI
        </div>
        <div>
          <h1 className="font-semibold text-gray-900 dark:text-white">SmartFund Assistant</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Personal Finance Decision Coach</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {entries.map(entry => {
          if (entry.type === 'system') {
            return (
              <div key={entry.id} className="flex justify-center">
                <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1">
                  {entry.content}
                </span>
              </div>
            );
          }

          if (entry.type === 'user') {
            return (
              <div key={entry.id} className="flex justify-end">
                <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap break-words">
                  {entry.content}
                </div>
              </div>
            );
          }

          // assistant
          return (
            <div key={entry.id} className="flex justify-start">
              <div className="max-w-[85%]">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 break-words">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      code: ({ children }) => <code className="bg-gray-200 dark:bg-gray-700 rounded px-1 text-xs font-mono">{children}</code>,
                    }}
                  >
                    {entry.content}
                  </ReactMarkdown>
                </div>

                {entry.toolTraces.length > 0 && (
                  <div className="mt-1 px-1">
                    <ToolTraceAccordion traces={entry.toolTraces} />
                  </div>
                )}

                {entry.pendingAction && !entry.pendingActionDone && (
                  <div className="px-1">
                    <ConfirmActionCard
                      pendingAction={entry.pendingAction}
                      onConfirmed={msg => markPendingDone(entry.id, msg)}
                      onCancelled={() => markPendingCancelled(entry.id)}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances… (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 ml-1">
          AI responses are grounded in your live data. Financial figures come directly from your accounts.
        </p>
      </div>
    </div>
  );
}
