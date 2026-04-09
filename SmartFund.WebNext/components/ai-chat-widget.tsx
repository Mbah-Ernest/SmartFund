'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, X, Sparkles, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import api from '@/lib/apiClient'

interface ToolTrace {
  toolName: string
  inputJson: string
  outputJson: string
  durationMs: number
}

interface PendingAction {
  id: string
  description: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolTraces?: ToolTrace[]
}

interface ChatTurn {
  role: string
  content: string
}

const suggestedPrompts = [
  "Can I afford a ₦600k iPhone?",
  "Summarise my spending",
  "What's my cash runway?",
  "Create a budget for me",
]

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = { id: `u-${Date.now()}`, role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const history: ChatTurn[] = messages.map(m => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content: text })

      const res = await api.post('/api/agent/chat', { messages: history })
      const data = res.data

      const assistantMessage: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply ?? '',
        toolTraces: data.toolTraces ?? [],
      }
      setMessages(prev => [...prev, assistantMessage])

      if (data.pendingAction) {
        setPendingAction(data.pendingAction)
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = () => {
    if (!input.trim()) return
    const text = input
    setInput('')
    sendMessage(text)
  }

  const handleConfirmAction = async () => {
    if (!pendingAction) return
    try {
      await api.post(`/api/agent/confirm-action/${pendingAction.id}`)
      setPendingAction(null)
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: 'Action confirmed and executed.',
      }])
    } catch {
      alert('Failed to confirm action.')
    }
  }

  const handleCancelAction = async () => {
    if (!pendingAction) return
    try {
      await api.delete(`/api/agent/pending-actions/${pendingAction.id}`)
    } catch { /* ignore */ }
    setPendingAction(null)
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Open AI Assistant"
          type="button"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[380px] h-[560px] rounded-2xl bg-background border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border rounded-t-2xl bg-card">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">SmartFund AI</h3>
                <p className="text-xs text-muted-foreground">Your financial assistant</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)} type="button">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          {/* Chat Area */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Bot className="h-7 w-7 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">How can I help?</h4>
                <p className="text-sm text-muted-foreground mb-6">Ask me anything about your finances</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedPrompts.map((prompt) => (
                    <Button key={prompt} variant="outline" size="sm" className="text-xs h-8" onClick={() => sendMessage(prompt)} type="button">
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={cn("flex gap-3", message.role === 'user' && "flex-row-reverse")}>
                    <Avatar className={cn("h-7 w-7 shrink-0", message.role === 'assistant' && "bg-primary")}>
                      <AvatarFallback className={cn("text-xs", message.role === 'assistant' && "bg-primary text-primary-foreground")}>
                        {message.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn("flex-1 max-w-[80%]", message.role === 'user' && "flex flex-col items-end")}>
                      <div className={cn("rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap", message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        {message.content}
                      </div>
                      {message.toolTraces && message.toolTraces.length > 0 && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                            <ChevronDown className="h-3 w-3" />{message.toolTraces.length} tool{message.toolTraces.length > 1 ? 's' : ''} called
                          </summary>
                          <div className="mt-1 space-y-1">
                            {message.toolTraces.map((t, i) => (
                              <div key={i} className="text-xs bg-secondary/50 rounded px-2 py-1">
                                <span className="font-mono text-primary">{t.toolName}</span>
                                <span className="text-muted-foreground"> ({t.durationMs}ms)</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <Avatar className="h-7 w-7 bg-primary">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-2xl px-3 py-2">
                      <div className="flex gap-1 items-center">
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                {pendingAction && (
                  <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                    <p className="text-sm font-medium mb-2">Confirm Action</p>
                    <p className="text-xs text-muted-foreground mb-3">{pendingAction.description}</p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleConfirmAction} className="flex-1">Confirm</Button>
                      <Button size="sm" variant="outline" onClick={handleCancelAction} className="flex-1">Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-3 border-t border-border">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleSend() }}>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your finances..."
                disabled={isLoading}
                className="flex-1 h-9 text-sm"
              />
              <Button type="submit" disabled={!input.trim() || isLoading} size="icon" className="h-9 w-9">
                <Send className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
