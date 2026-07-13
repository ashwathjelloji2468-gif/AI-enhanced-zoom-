'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Brain, Send, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  loading?: boolean;
}

interface AskAIPanelProps {
  meetingCode: string;
  onClose: () => void;
}

export default function AskAIPanel({ meetingCode, onClose }: AskAIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ask me any questions about the meeting so far! I will answer based strictly on the live transcript.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isPending, setIsPending] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of thread
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    const questionText = input.trim();
    setInput('');
    setIsPending(true);

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    // Optimistically add user message and loader block
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', text: questionText },
      { id: assistantMsgId, role: 'assistant', text: '', loading: true },
    ]);

    try {
      const res = await fetch(`/api/meetings/${meetingCode}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionText }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to retrieve answer');
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, text: data.answer, loading: false }
            : msg
        )
      );
    } catch (err: any) {
      console.error('Error asking AI:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                text: `Error: ${err.message || 'Failed to connect to AI server.'}`,
                loading: false,
              }
            : msg
        )
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-surface text-white border-l border-dark-border overflow-hidden">
      
      {/* Panel Header */}
      <div className="p-4 border-b border-dark-border flex items-center justify-between bg-dark-surface">
        <div className="flex items-center space-x-2">
          <Brain className="h-4 w-4 text-brand" />
          <h3 className="font-bold text-white text-sm font-display">Ask AI Companion</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose} 
          className="text-ink-inverse-muted hover:text-white h-8 w-8 p-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface rounded-sm outline-none"
          aria-label="Close Ask AI Panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Message History Thread */}
      <ScrollArea className="flex-1 p-4 bg-dark-bg">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col space-y-1 ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <span className="text-[10px] text-ink-inverse-muted font-medium px-1 font-mono">
                {msg.role === 'user' ? 'You' : 'AI Companion'}
              </span>
              
              {msg.loading ? (
                <div className="bg-dark-surface border border-dark-border p-3 rounded-lg rounded-tl-none flex items-center space-x-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
                  <span className="text-xs text-ink-inverse-muted animate-pulse">Compiling grounded answer...</span>
                </div>
              ) : (
                <div 
                  className={`px-3 py-2.5 rounded-lg text-xs leading-relaxed max-w-[90%] break-words ${
                    msg.role === 'user'
                      ? 'bg-brand text-white rounded-tr-none'
                      : 'bg-dark-surface border border-dark-border text-white rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
              )}
            </div>
          ))}
          <div ref={scrollEndRef} />
        </div>
      </ScrollArea>

      {/* Input Message Form */}
      <form 
        onSubmit={handleSendQuestion} 
        className="p-4 border-t border-dark-border bg-dark-surface flex items-center space-x-2"
      >
        <Input
          placeholder="Ask about this meeting..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isPending}
          className="bg-dark-bg text-white border-dark-border text-xs py-1.5 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface flex-1 min-h-[44px]"
        />
        <Button 
          type="submit" 
          size="sm" 
          disabled={!input.trim() || isPending}
          className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-white h-11 px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface rounded-sm min-h-[44px]"
          aria-label="Send query"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>

    </div>
  );
}
