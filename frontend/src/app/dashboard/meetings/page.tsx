'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Clipboard, 
  Check, 
  Calendar,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserProfile {
  id: string;
  name: string;
}

interface MeetingItem {
  id: string;
  code: string;
  title: string;
  status: 'SCHEDULED' | 'ONGOING' | 'ENDED' | 'CANCELLED';
  scheduledAt?: string | null;
  startedAt?: string | null;
}

export default function MeetingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const loadMeetings = async () => {
      try {
        const userRes = await fetch('/api/users/me');
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.user);
        }

        const meetingsRes = await fetch('/api/meetings');
        if (meetingsRes.ok) {
          const meetingsData = await meetingsRes.json();
          setMeetings(meetingsData.meetings);
        }
      } catch (err) {
        console.error('Failed to load meetings list:', err);
      }
    };
    loadMeetings();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const upcomingMeetings = meetings.filter(m => m.status === 'SCHEDULED' || m.status === 'ONGOING');
  const pastMeetings = meetings.filter(m => m.status === 'ENDED' || m.status === 'CANCELLED');

  return (
    <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto max-w-5xl mx-auto w-full text-ink">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-ink tracking-tight font-display">Meetings</h1>
          <p className="text-ink-muted text-sm mt-1">Manage and launch your scheduled conference rooms</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Personal Meeting Room Box */}
        <div className="md:col-span-4">
          <Card className="border-surface-border bg-white shadow-sm p-6 rounded-lg text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-subtle text-brand-text">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <h3 className="font-bold text-ink text-lg font-display">Personal Meeting Room</h3>
            <p className="text-ink-muted text-xs leading-relaxed font-sans">
              Your personal room uses a fixed meeting code. Share it for instant syncs.
            </p>
            <div className="p-3 bg-surface-sunken rounded-lg border border-surface-border">
              <p className="text-[10px] text-ink-muted font-bold uppercase tracking-wider font-sans">Room Code</p>
              <p className="text-base font-bold font-mono text-brand-text mt-1">
                {user?.id ? `${user.id.substring(0, 3)}-${user.id.substring(3, 7)}-${user.id.substring(7, 10)}` : 'personal-room'}
              </p>
            </div>
            <Button 
              className="w-full bg-brand hover:bg-brand-hover text-white font-medium focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[44px]"
              onClick={() => router.push(`/meeting/${user?.id || 'personal-room'}`)}
            >
              Start Room
            </Button>
          </Card>
        </div>

        {/* Right Column: List of all Meetings with tabs */}
        <div className="md:col-span-8">
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="bg-surface border border-surface-border text-ink-muted grid w-full grid-cols-2 p-1 rounded-lg">
              <TabsTrigger 
                value="upcoming"
                className="rounded-md data-[state=active]:bg-brand-subtle data-[state=active]:text-brand-text font-semibold transition-all py-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none"
              >
                Upcoming
              </TabsTrigger>
              <TabsTrigger 
                value="previous"
                className="rounded-md data-[state=active]:bg-brand-subtle data-[state=active]:text-brand-text font-semibold transition-all py-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none"
              >
                History
              </TabsTrigger>
            </TabsList>
            
            {/* Upcoming Tab Content */}
            <TabsContent value="upcoming" className="mt-6 space-y-4">
              {upcomingMeetings.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-surface-border bg-white rounded-lg text-ink-muted text-sm flex flex-col items-center">
                  <Calendar className="h-8 w-8 text-ink-faint mb-2" />
                  <p>No meetings yet. Create one to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className="flex items-center justify-between p-4 rounded-lg border border-surface-border bg-white hover:bg-surface-sunken transition-all"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-ink">{meeting.title}</p>
                        <p className="text-xs text-ink-muted">
                          Code: <code className="text-brand-text font-bold font-mono">{meeting.code}</code>
                          {meeting.scheduledAt && (
                            <span className="ml-3">• {new Date(meeting.scheduledAt).toLocaleString()}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-surface-border hover:bg-surface-sunken text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[44px]"
                          onClick={() => copyToClipboard(meeting.code)}
                          aria-label={`Copy meeting code for ${meeting.title}`}
                        >
                          {copiedCode === meeting.code ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Clipboard className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-brand hover:bg-brand-hover text-white font-medium focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[44px]"
                          onClick={() => router.push(`/meeting/${meeting.code}`)}
                        >
                          Start
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* History Tab Content */}
            <TabsContent value="previous" className="mt-6 space-y-4">
              {pastMeetings.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-surface-border bg-white rounded-lg text-ink-muted text-sm flex flex-col items-center">
                  <Calendar className="h-8 w-8 text-ink-faint mb-2" />
                  <p>No meetings yet. Create one to get started.</p>
                </div>
              ) : (
                <div className="space-y-3 opacity-90">
                  {pastMeetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className="flex items-center justify-between p-4 rounded-lg border border-surface-border bg-white"
                    >
                      <div>
                        <p className="font-semibold text-ink">{meeting.title}</p>
                        <p className="text-xs text-ink-muted">
                          Code: <code className="font-mono">{meeting.code}</code>
                          {meeting.startedAt && (
                            <span className="ml-3">Conducted on {new Date(meeting.startedAt).toLocaleDateString()}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/meetings/${meeting.code}/summary`)}
                          className="h-8 text-xs bg-brand-subtle border-brand-light/10 text-brand-text hover:bg-brand hover:text-white flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[32px] sm:min-h-[44px] transition-all"
                        >
                          <Brain className="h-3.5 w-3.5" />
                          AI Summary
                        </Button>
                        <span className="text-[10px] text-ink-muted font-bold bg-surface-sunken border border-surface-border px-2.5 py-1.5 rounded-full uppercase">
                          Ended
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

      </div>
    </div>
  );
}
