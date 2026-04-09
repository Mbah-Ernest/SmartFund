import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessageDto, ToolTrace, PendingActionSummary } from '@/modules/personalFinance/services/agentApi';
import { sendChatMessage } from '@/modules/personalFinance/services/agentApi';
import ToolTraceAccordion from '@/modules/personalFinance/components/chat/ToolTraceAccordion';
import ConfirmActionCard from '@/modules/personalFinance/components/chat/ConfirmActionCard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sparkles, X, Send } from 'lucide-react';

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

let idCounter = 0;
const nextId = () => `msg-${++idCounter}`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ChatEntry[]>([
    {
      id: nextId(),
      type: 'system',
      content:
        'SmartFund Assistant is ready. Ask me anything about your finances — e.g. "What are my wallet balances?" or "Can I afford a ₦600k iPhone?"',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries, open]);

  const getHistory = (): ChatMessageDto[] =>
    entries
      .filter((e): e is UserMessage | AssistantMessage =>
        e.type === 'user' || e.type === 'assistant',
      )
      .map((e) => ({ role: e.type as 'user' | 'assistant', content: e.content }))
      .slice(-40);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setEntries((prev) => [...prev, { id: nextId(), type: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const history = getHistory();
      history.push({ role: 'user', content: text });
      const response = await sendChatMessage(history);

      setEntries((prev) => [
        ...prev,
        {
          id: nextId(),
          type: 'assistant',
          content: response.reply,
          toolTraces: response.toolTraces,
          pendingAction: response.pendingAction,
          pendingActionDone: false,
        },
      ]);
    } catch (e: unknown) {
      setEntries((prev) => [
        ...prev,
        {
          id: nextId(),
          type: 'system',
          content: `Error: ${e instanceof Error ? e.message : 'Something went wrong. Please try again.'}`,
        },
      ]);
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
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id || e.type !== 'assistant') return e;
        return {
          ...e,
          pendingActionDone: true,
          content: e.content + '\n\n✅ ' + result,
        } as AssistantMessage;
      }),
    );
  };

  const markPendingCancelled = (id: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id || e.type !== 'assistant') return e;
        return { ...e, pendingActionDone: true } as AssistantMessage;
      }),
    );
  };

  return (
    <>
      {/* Chat panel */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-50 w-[380px] flex flex-col rounded-2xl shadow-2xl border border-border bg-card overflow-hidden transition-all duration-300',
          open
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none',
        )}
        style={{ height: open ? 'min(560px, calc(100vh - 7rem))' : '0' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0 bg-card">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary flex-shrink-0">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">SmartFund AI</p>
            <p className="text-xs text-muted-foreground">Finance Decision Coach</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="h-7 w-7"
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
          {entries.map((entry) => {
            if (entry.type === 'system') {
              return (
                <div key={entry.id} className="flex justify-center">
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-3 py-1 text-center leading-relaxed">
                    {entry.content}
                  </span>
                </div>
              );
            }

            if (entry.type === 'user') {
              return (
                <div key={entry.id} className="flex justify-end">
                  <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 text-sm whitespace-pre-wrap break-words">
                    {entry.content}
                  </div>
                </div>
              );
            }

            return (
              <div key={entry.id} className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-foreground break-words">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                        ul: ({ children }) => (
                          <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>
                        ),
                        li: ({ children }) => <li>{children}</li>,
                        strong: ({ children }) => (
                          <strong className="font-semibold">{children}</strong>
                        ),
                        em: ({ children }) => <em className="italic">{children}</em>,
                        code: ({ children }) => (
                          <code className="bg-secondary rounded px-1 text-xs font-mono">
                            {children}
                          </code>
                        ),
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
                        onConfirmed={(msg) => markPendingDone(entry.id, msg)}
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
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <div
                    className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border px-3 py-3 flex-shrink-0 bg-card">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your finances… (Enter to send)"
              rows={1}
              disabled={loading}
              className="flex-1 resize-none rounded-xl border border-input bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              style={{ maxHeight: '80px', overflowY: 'auto' }}
            />
            <Button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              size="icon"
              className="flex-shrink-0 h-9 w-9 rounded-xl"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 ml-1">
            Responses are grounded in your live financial data.
          </p>
        </div>
      </div>

      {/* Floating action button */}
      <Button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-xl transition-all duration-200',
          open ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : '',
        )}
        size="icon"
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <Sparkles className="h-6 w-6" />
        )}
      </Button>
    </>
  );
}
