import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessageDto, ToolTrace, PendingActionSummary } from '../services/agentApi';
import { sendChatMessage } from '../services/agentApi';
import ToolTraceAccordion from '../components/chat/ToolTraceAccordion';
import ConfirmActionCard from '../components/chat/ConfirmActionCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SendHorizonal, BotMessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-h-0">
      {/* Page heading */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <BotMessageSquare className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SmartFund Assistant</h1>
          <p className="text-muted-foreground text-sm">Personal Finance Decision Coach</p>
        </div>
      </div>

      {/* Chat card */}
      <Card className="rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden">
        <CardContent className="flex flex-col flex-1 min-h-0 p-0">
          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
            {entries.map(entry => {
              if (entry.type === 'system') {
                return (
                  <div key={entry.id} className="flex justify-center">
                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-3 py-1">
                      {entry.content}
                    </span>
                  </div>
                );
              }

              if (entry.type === 'user') {
                return (
                  <div key={entry.id} className="flex justify-end">
                    <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap break-words">
                      {entry.content}
                    </div>
                  </div>
                );
              }

              // assistant
              return (
                <div key={entry.id} className="flex justify-start">
                  <div className="max-w-[85%]">
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-foreground break-words">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ children }) => <code className="bg-background/60 rounded px-1 text-xs font-mono">{children}</code>,
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
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t px-4 py-3">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your finances… (Enter to send, Shift+Enter for newline)"
                rows={1}
                className={cn(
                  'flex-1 resize-none rounded-xl border border-input bg-background text-foreground',
                  'px-4 py-2.5 text-sm placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
                  'disabled:opacity-50'
                )}
                style={{ maxHeight: '120px', overflowY: 'auto' }}
                disabled={loading}
              />
              <Button
                onClick={() => void sendMessage()}
                disabled={loading || !input.trim()}
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl"
              >
                <SendHorizonal className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 ml-1">
              AI responses are grounded in your live data. Financial figures come directly from your accounts.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
