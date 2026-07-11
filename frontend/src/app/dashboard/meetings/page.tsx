'use strict';
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
    <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Meetings</h1>
          <p className="text-slate-400 text-sm mt-1">Manage and launch your scheduled conference rooms</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Personal Meeting Room Box */}
        <div className="md:col-span-4">
          <Card className="border-slate-800 bg-slate-900/40 backdrop-blur shadow-lg p-6 rounded-2xl text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <h3 className="font-bold text-white text-lg">Personal Meeting Room</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Your personal room uses a fixed meeting code. Share it for instant syncs.
            </p>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Room Code</p>
              <p className="text-base font-black font-mono text-blue-400 mt-1">
                {user?.id ? `${user.id.substring(0, 3)}-${user.id.substring(3, 7)}-${user.id.substring(7, 10)}` : 'personal-room'}
              </p>
            </div>
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              onClick={() => router.push(`/meeting/${user?.id || 'personal-room'}`)}
            >
              Start Room
            </Button>
          </Card>
        </div>

        {/* Right Column: List of all Meetings with tabs */}
        <div className="md:col-span-8">
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="bg-slate-900 border border-slate-800 text-slate-400 grid w-full grid-cols-2 p-1 rounded-xl">
              <TabsTrigger 
                value="upcoming"
                className="rounded-lg data-[state=active]:bg-slate-800 data-[state=active]:text-white font-semibold transition-all py-2"
              >
                Upcoming
              </TabsTrigger>
              <TabsTrigger 
                value="previous"
                className="rounded-lg data-[state=active]:bg-slate-800 data-[state=active]:text-white font-semibold transition-all py-2"
              >
                History
              </TabsTrigger>
            </TabsList>
            
            {/* Upcoming Tab Content */}
            <TabsContent value="upcoming" className="mt-6 space-y-4">
              {upcomingMeetings.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800 bg-slate-900/10 rounded-2xl text-slate-400 text-sm flex flex-col items-center">
                  <Calendar className="h-8 w-8 text-slate-600 mb-2" />
                  <p>No upcoming meetings scheduled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className="flex items-center justify-between p-4 rounded-2xl border border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 transition-all"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-slate-200">{meeting.title}</p>
                        <p className="text-xs text-slate-400">
                          Code: <code className="text-blue-400 font-bold">{meeting.code}</code>
                          {meeting.scheduledAt && (
                            <span className="ml-3">• {new Date(meeting.scheduledAt).toLocaleString()}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200"
                          onClick={() => copyToClipboard(meeting.code)}
                        >
                          {copiedCode === meeting.code ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clipboard className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
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
                <div className="p-8 text-center border border-dashed border-slate-800 bg-slate-900/10 rounded-2xl text-slate-400 text-sm flex flex-col items-center">
                  <Calendar className="h-8 w-8 text-slate-600 mb-2" />
                  <p>No previous meetings recorded</p>
                </div>
              ) : (
                <div className="space-y-3 opacity-75">
                  {pastMeetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className="flex items-center justify-between p-4 rounded-2xl border border-slate-850 bg-slate-900/15"
                    >
                      <div>
                        <p className="font-semibold text-slate-300">{meeting.title}</p>
                        <p className="text-xs text-slate-500">
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
                          className="h-8 text-xs bg-slate-900 border-slate-800 text-indigo-400 hover:text-indigo-300 hover:bg-slate-850 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Brain className="h-3.5 w-3.5" />
                          AI Summary
                        </Button>
                        <span className="text-[10px] text-slate-500 font-bold bg-slate-950 border border-slate-900 px-2.5 py-1.5 rounded-full uppercase">
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
