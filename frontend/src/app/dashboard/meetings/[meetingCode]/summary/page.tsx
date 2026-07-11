'use strict';
'use client';

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
  Clock,
  ExternalLink
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative font-sans p-6 md:p-8">
      
      {/* Background glow */}
      <div className="absolute top-0 right-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-blue-600/5 blur-[128px]" />
      
      {/* Header back button */}
      <div className="max-w-4xl mx-auto w-full mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/dashboard/meetings')} 
          className="text-slate-400 hover:text-white flex items-center pl-0"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Meetings
        </Button>
      </div>

      <main className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center">

        {/* ──── LOADING STATE ──── */}
        {status === 'LOADING' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-20">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-slate-400 font-medium">Retrieving meeting details...</p>
          </div>
        )}

        {/* ──── PROCESSING STATE ──── */}
        {status === 'PROCESSING' && (
          <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-xl p-8 rounded-2xl shadow-xl text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-16 w-16 animate-pulse rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Brain className="h-8 w-8 animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">AI Summary Processing</h2>
              <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                The recording was saved successfully. AI is currently transcribing and compiling the summary.
              </p>
            </div>
            <div className="flex justify-center">
              <span className="inline-flex items-center bg-blue-950 border border-blue-900/30 px-4 py-1.5 rounded-full text-xs font-semibold text-blue-400 animate-pulse">
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Compiling decisions & task checklists...
              </span>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Real-time compilation page. Do not refresh.</p>
          </Card>
        )}

        {/* ──── ERROR STATE ──── */}
        {status === 'ERROR' && (
          <Card className="border-red-900/30 bg-red-950/10 backdrop-blur p-8 rounded-2xl shadow-xl text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                <FileText className="h-6 w-6" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white">Summary Unavailable</h2>
            <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">{errorMsg || 'Failed to load summaries'}</p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => router.push('/dashboard/meetings')} className="bg-slate-850 hover:bg-slate-800 text-slate-400 border border-slate-800 cursor-pointer">
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
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
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
            <div className="border-b border-slate-900 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <span className="inline-flex items-center space-x-1.5 bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full text-xs font-bold">
                    <Brain className="h-3.5 w-3.5" />
                    <span>AI Generated Summary</span>
                  </span>
                  <h1 className="text-3xl font-black tracking-tight text-white mt-2">
                    Project Conference Summary
                  </h1>
                </div>
                <div className="text-xs text-slate-500 sm:text-right space-y-1 font-mono">
                  <p className="flex items-center sm:justify-end gap-1.5"><Calendar className="h-3.5 w-3.5" /> {new Date(summary.createdAt).toLocaleDateString()}</p>
                  <p className="flex items-center sm:justify-end gap-1.5"><Clock className="h-3.5 w-3.5" /> {new Date(summary.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>

            {/* Overview paragraph card */}
            <Card className="border-slate-850 bg-slate-900/20 backdrop-blur rounded-2xl overflow-hidden">
              <CardContent className="p-6 space-y-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center">
                  Overview
                </h3>
                <p className="text-slate-200 text-base leading-relaxed">
                  {summary.overview}
                </p>
              </CardContent>
            </Card>

            {/* Decisions and Action Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Decisions Column */}
              <Card className="border-slate-850 bg-slate-900/20 backdrop-blur rounded-2xl flex flex-col">
                <CardContent className="p-6 space-y-4 flex-1">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center">
                    <Award className="h-4 w-4 text-indigo-400 mr-2" />
                    Key Decisions
                  </h3>
                  {summary.keyDecisions.length === 0 ? (
                    <p className="text-slate-500 text-xs italic">No decisions extracted from the meeting transcript.</p>
                  ) : (
                    <ul className="space-y-3">
                      {summary.keyDecisions.map((decision, index) => (
                        <li key={index} className="flex items-start text-sm text-slate-350 leading-relaxed">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-2 mr-2.5 flex-shrink-0" />
                          <span>{decision}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Action Items Column */}
              <Card className="border-slate-850 bg-slate-900/20 backdrop-blur rounded-2xl flex flex-col">
                <CardContent className="p-6 space-y-4 flex-1">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center">
                    <CheckSquare className="h-4 w-4 text-green-400 mr-2" />
                    Action Items Checklist
                  </h3>
                  {actionItems.length === 0 ? (
                    <p className="text-slate-500 text-xs italic">No action items assigned during this meeting.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {actionItems.map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-start space-x-3 cursor-pointer group"
                          onClick={() => handleToggleActionItem(item.id, item.completed)}
                        >
                          {item.completed ? (
                            <CheckSquare className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-0.5 transition-colors" />
                          )}
                          <div className="space-y-1">
                            <p className={`text-sm text-slate-300 transition-all leading-normal ${item.completed ? 'line-through text-slate-550' : ''}`}>
                              {item.description}
                            </p>
                            {(item.assigneeName || item.dueDate) && (
                              <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 font-mono">
                                {item.assigneeName && (
                                  <span className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-850">
                                    <User className="h-2.5 w-2.5 text-blue-500" /> {item.assigneeName}
                                  </span>
                                )}
                                {item.dueDate && (
                                  <span className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-850">
                                    <Calendar className="h-2.5 w-2.5 text-purple-500" /> {new Date(item.dueDate).toLocaleDateString()}
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
            <Card className="border-slate-850 bg-slate-900/20 backdrop-blur rounded-2xl overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer bg-slate-900/40 hover:bg-slate-900/60 transition-colors"
                onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
              >
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center">
                  Full Meeting Transcript
                </h3>
                {isTranscriptOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </div>
              
              {isTranscriptOpen && (
                <CardContent className="p-0 border-t border-slate-900">
                  <ScrollArea className="h-80 w-full p-6 bg-slate-950/60 font-mono text-xs text-slate-400 leading-relaxed">
                    <pre className="whitespace-pre-wrap font-sans leading-normal">{summary.transcript}</pre>
                  </ScrollArea>
                </CardContent>
              )}
            </Card>

            {/* Auditability Footer */}
            <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono px-2 pt-4">
              <span>Audit Log Model: {summary.model}</span>
              <span>ID: {summary.id.substring(0, 8)}</span>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
