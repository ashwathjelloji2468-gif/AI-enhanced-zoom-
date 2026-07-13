'use strict';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { io } from 'socket.io-client';
import { 
  FileText, 
  ArrowLeft, 
  Loader2, 
  CheckSquare, 
  Square,
  Award,
  ChevronDown,
  ChevronUp,
  Brain,
  Calendar,
  User,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActionItem {
  id: string;
  description: string;
  assigneeName: string | null;
  dueDate: string | null;
  completed: boolean;
}

interface SummaryData {
  id: string;
  meetingId: string;
  overview: string;
  keyDecisions: string[];
  transcript: string;
  model: string;
  createdAt: string;
}

export default function MeetingSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const meetingCode = params.meetingCode as string;

  const [status, setStatus] = useState<'LOADING' | 'PROCESSING' | 'READY' | 'ERROR'>('LOADING');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  // Fetch summary from API
  const fetchSummary = async (showLoading = true) => {
    if (showLoading) setStatus('LOADING');
    try {
      const res = await fetch(`/api/meetings/${meetingCode}/summary`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404) {
          setErrorMsg('No summary or recording exists for this meeting.');
          setStatus('ERROR');
        } else {
          setErrorMsg(data.error || 'Failed to fetch summary');
          setStatus('ERROR');
        }
        return;
      }

      if (data.status === 'PROCESSING') {
        setStatus('PROCESSING');
      } else if (data.status === 'FAILED') {
        setErrorMsg(data.error || 'AI summary compilation failed.');
        setStatus('ERROR');
      } else if (data.status === 'READY') {
        setSummary(data.summary);
        setActionItems(data.actionItems);
        setStatus('READY');
      }
    } catch (err: any) {
      console.error('Error fetching summary:', err);
      setErrorMsg('Failed to load meeting summary');
      setStatus('ERROR');
    }
  };

  useEffect(() => {
    if (meetingCode) {
      fetchSummary();
    }
  }, [meetingCode]);

  // Real-time socket listener for compilation completions
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';
    const socket = io(socketUrl, { withCredentials: true });

    socket.on('connect', () => {
      // Join signaling room to receive broadcasts
      socket.emit('join-room', {
        room: meetingCode,
        userId: 'summary-viewer',
        name: 'Summary Viewer',
        micOn: false,
        cameraOn: false,
      });
    });

    socket.on('summary-ready', ({ meetingId, summaryId }) => {
      console.log(`Received summary-ready socket broadcast! Reloading summary details...`);
      fetchSummary(false); // Silent reload, converting processing layout directly to summary panel
    });

    // Fallback Polling if status remains PROCESSING
    let interval: NodeJS.Timeout;
    if (status === 'PROCESSING') {
      interval = setInterval(() => {
        fetchSummary(false);
      }, 5000);
    }

    return () => {
      socket.disconnect();
      if (interval) clearInterval(interval);
    };
  }, [meetingCode, status]);

  // Toggle action item completion status
  const handleToggleActionItem = async (itemId: string, currentCompleted: boolean) => {
    // Optimistic UI update
    const previousItems = [...actionItems];
    setActionItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, completed: !currentCompleted } : item))
    );

    try {
      const res = await fetch(`/api/action-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentCompleted }),
      });

      if (!res.ok) {
        throw new Error('Failed to update item');
      }
    } catch (err) {
      console.error('Error updating action item:', err);
      // Rollback on error
      setActionItems(previousItems);
      alert('Failed to update action item. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-surface-sunken text-ink flex flex-col relative font-sans p-6 md:p-8">
      
      {/* Header back button */}
      <div className="max-w-4xl mx-auto w-full mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/dashboard/meetings')} 
          className="text-ink-muted hover:text-ink flex items-center pl-0 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Meetings
        </Button>
      </div>

      <main className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center">

        {/* ──── LOADING STATE ──── */}
        {status === 'LOADING' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-20">
            <Loader2 className="h-10 w-10 animate-spin text-brand" />
            <p className="text-ink-muted font-medium text-sm">Retrieving meeting details...</p>
          </div>
        )}

        {/* ──── PROCESSING STATE ──── */}
        {status === 'PROCESSING' && (
          <Card className="border-surface-border bg-white p-8 rounded-lg shadow-sm text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-16 w-16 animate-pulse rounded-full bg-brand-subtle border border-brand-light/35 flex items-center justify-center text-brand-text">
                <Brain className="h-8 w-8 animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-ink font-display">AI Summary Processing</h2>
              <p className="text-ink-muted text-sm max-w-sm mx-auto leading-relaxed font-sans">
                The recording was saved successfully. AI is currently transcribing and compiling the summary.
              </p>
            </div>
            <div className="flex justify-center">
              <span className="inline-flex items-center bg-brand-subtle border border-brand-light/10 px-4 py-1.5 rounded-full text-xs font-semibold text-brand-text animate-pulse">
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Compiling decisions & task checklists...
              </span>
            </div>
            <p className="text-[10px] text-ink-muted uppercase tracking-widest font-mono">Real-time compilation page. Do not refresh.</p>
          </Card>
        )}

        {/* ──── ERROR STATE ──── */}
        {status === 'ERROR' && (
          <Card className="border-danger/10 bg-danger/5 p-8 rounded-lg shadow-sm text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-danger/10 text-danger flex items-center justify-center">
                <FileText className="h-6 w-6" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-ink font-display">Summary Unavailable</h2>
            <p className="text-ink-muted text-sm max-w-sm mx-auto leading-relaxed">{errorMsg || 'Failed to load summaries'}</p>
            <div className="flex justify-center gap-3">
              <Button 
                onClick={() => router.push('/dashboard/meetings')} 
                className="border-surface-border hover:bg-surface-sunken text-ink min-h-[44px]"
              >
                Go Back
              </Button>
              {(errorMsg?.includes('failed') || errorMsg?.includes('timeout') || errorMsg?.includes('recording')) && (
                <Button 
                  onClick={async () => {
                    setStatus('LOADING');
                    try {
                      const res = await fetch(`/api/meetings/${meetingCode}/recording/stop`, { method: 'POST' });
                      const data = await res.json();
                      if (res.ok) {
                        setStatus('PROCESSING');
                      } else {
                        alert(data.error || 'Failed to trigger retry');
                        setStatus('ERROR');
                      }
                    } catch (err) {
                      alert('Error triggering retry');
                      setStatus('ERROR');
                    }
                  }} 
                  className="bg-brand hover:bg-brand-hover text-white font-medium min-h-[44px]"
                >
                  Retry AI Compilation
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* ──── SUMMARY PANEL (READY) ──── */}
        {status === 'READY' && summary && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Topic Info */}
            <div className="border-b border-surface-border pb-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <span className="inline-flex items-center space-x-1.5 bg-brand-subtle text-brand-text px-2.5 py-1 rounded-full text-xs font-semibold border border-brand-light/10">
                    <Brain className="h-3.5 w-3.5" />
                    <span>AI Generated Summary</span>
                  </span>
                  <h1 className="text-3xl font-bold tracking-tight text-ink mt-2 font-display">
                    Meeting Conference Summary
                  </h1>
                </div>
                <div className="text-xs text-ink-muted sm:text-right space-y-1 font-mono">
                  <p className="flex items-center sm:justify-end gap-1.5"><Calendar className="h-3.5 w-3.5" /> {new Date(summary.createdAt).toLocaleDateString()}</p>
                  <p className="flex items-center sm:justify-end gap-1.5"><Clock className="h-3.5 w-3.5" /> {new Date(summary.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>

            {/* Overview paragraph card */}
            <Card className="border-surface-border bg-white rounded-lg overflow-hidden">
              <CardContent className="p-6 space-y-2">
                <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center font-display">
                  Overview
                </h3>
                <p className="text-ink text-base leading-relaxed font-sans">
                  {summary.overview}
                </p>
              </CardContent>
            </Card>

            {/* Decisions and Action Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Decisions Column */}
              <Card className="border-surface-border bg-white rounded-lg flex flex-col">
                <CardContent className="p-6 space-y-4 flex-1">
                  <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center font-display">
                    <Award className="h-4 w-4 text-brand mr-2" />
                    Key Decisions
                  </h3>
                  {summary.keyDecisions.length === 0 ? (
                    <p className="text-ink-muted text-xs italic">No decisions extracted from the meeting transcript.</p>
                  ) : (
                    <ul className="space-y-3">
                      {summary.keyDecisions.map((decision, index) => (
                        <li key={index} className="flex items-start text-sm text-ink-muted leading-relaxed">
                          <span className="h-1.5 w-1.5 rounded-full bg-brand mt-2 mr-2.5 flex-shrink-0" />
                          <span>{decision}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Action Items Column */}
              <Card className="border-surface-border bg-white rounded-lg flex flex-col">
                <CardContent className="p-6 space-y-4 flex-1">
                  <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center font-display">
                    <CheckSquare className="h-4 w-4 text-success mr-2" />
                    Action Items Checklist
                  </h3>
                  {actionItems.length === 0 ? (
                    <p className="text-ink-muted text-xs italic">No action items assigned during this meeting.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {actionItems.map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-start space-x-3 cursor-pointer group"
                          onClick={() => handleToggleActionItem(item.id, item.completed)}
                        >
                          {item.completed ? (
                            <CheckSquare className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                          ) : (
                            <Square className="h-5 w-5 text-ink-faint group-hover:text-ink-muted flex-shrink-0 mt-0.5 transition-colors" />
                          )}
                          <div className="space-y-1">
                            <p className={`text-sm text-ink transition-all leading-normal ${item.completed ? 'line-through text-ink-muted' : ''}`}>
                              {item.description}
                            </p>
                            {(item.assigneeName || item.dueDate) && (
                              <div className="flex flex-wrap gap-2 text-[10px] text-ink-muted font-mono mt-1">
                                {item.assigneeName && (
                                  <span className="flex items-center gap-1 bg-surface-sunken px-2 py-0.5 rounded border border-surface-border">
                                    <User className="h-2.5 w-2.5 text-brand" /> {item.assigneeName}
                                  </span>
                                )}
                                {item.dueDate && (
                                  <span className="flex items-center gap-1 bg-surface-sunken px-2 py-0.5 rounded border border-surface-border">
                                    <Calendar className="h-2.5 w-2.5 text-brand" /> {new Date(item.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>

            {/* Collapsible Transcript section */}
            <Card className="border-surface-border bg-white rounded-lg overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer bg-surface hover:bg-surface-sunken transition-colors"
                onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
              >
                <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center font-display">
                  Full Meeting Transcript
                </h3>
                {isTranscriptOpen ? <ChevronUp className="h-4 w-4 text-ink-muted" /> : <ChevronDown className="h-4 w-4 text-ink-muted" />}
              </div>
              
              {isTranscriptOpen && (
                <CardContent className="p-0 border-t border-surface-border">
                  <ScrollArea className="h-80 w-full p-6 bg-surface-sunken font-mono text-xs text-ink-muted leading-relaxed">
                    <pre className="whitespace-pre-wrap font-sans leading-normal">{summary.transcript}</pre>
                  </ScrollArea>
                </CardContent>
              )}
            </Card>

            {/* Auditability Footer */}
            <div className="flex items-center justify-between text-[10px] text-ink-muted font-mono px-2 pt-4">
              <span>Model: {summary.model}</span>
              <span>ID: {summary.id.substring(0, 8)}</span>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
