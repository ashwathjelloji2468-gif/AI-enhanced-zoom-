'use strict';
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
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="h-4 w-4 text-indigo-400" />
          <h3 className="font-bold text-white text-sm">Ask AI Companion</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose} 
          className="text-slate-400 hover:text-white h-8 w-8 p-0 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Message History Thread */}
      <ScrollArea className="flex-1 p-4 bg-slate-900">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col space-y-1 ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <span className="text-[10px] text-slate-500 font-medium px-1 font-mono">
                {msg.role === 'user' ? 'You' : 'AI Companion'}
              </span>
              
              {msg.loading ? (
                <div className="bg-slate-950 border border-slate-850/60 p-3 rounded-2xl rounded-tl-none flex items-center space-x-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                  <span className="text-xs text-slate-450 animate-pulse">Compiling grounded answer...</span>
                </div>
              ) : (
                <div 
                  className={`px-3 py-2.5 rounded-2xl text-xs leading-relaxed max-w-[90%] break-words ${
                    msg.role === 'user'
                      ? 'bg-indigo-650 border border-indigo-600/50 text-white rounded-tr-none'
                      : 'bg-slate-950 border border-slate-850/60 text-slate-200 rounded-tl-none'
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
        className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center space-x-2"
      >
        <Input
          placeholder="Ask about this meeting..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isPending}
          className="border-slate-800 bg-slate-950 text-white text-xs py-1.5 focus:border-indigo-500 flex-1 focus:ring-0"
        />
        <Button 
          type="submit" 
          size="sm" 
          disabled={!input.trim() || isPending}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white h-9 px-3 cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>

    </div>
  );
}
