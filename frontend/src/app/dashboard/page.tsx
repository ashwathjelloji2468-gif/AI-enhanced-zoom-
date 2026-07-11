'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Video, 
  PlusSquare, 
  Calendar, 
  Tv, 
  Clock, 
  VideoOff,
  Clipboard,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

interface MeetingItem {
  id: string;
  code: string;
  title: string;
  status: 'SCHEDULED' | 'ONGOING' | 'ENDED' | 'CANCELLED';
  scheduledAt?: string | null;
}

export default function DashboardHome() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Modals state
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  
  // Join form state
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  
  // Schedule form state
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [waitingRoom, setWaitingRoom] = useState(true);
  const [scheduleError, setScheduleError] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  // Clipboard copy state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
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
        console.error('Failed to load dashboard data:', err);
      }
    };
    loadData();
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const startInstantMeeting = async () => {
    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `${user?.name || 'My'}'s Instant Meeting`,
          waitingRoom: false,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Redirect to meeting room
      router.push(`/meeting/${data.meeting.code}`);
    } catch (err: any) {
      alert(err.message || 'Could not start instant meeting');
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');

    if (!joinCode.trim()) {
      setJoinError('Please enter a valid meeting code');
      return;
    }

    const cleanedCode = joinCode.trim().toLowerCase();
    router.push(`/meeting/${cleanedCode}`);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError('');
    setIsScheduling(true);

    if (!scheduleTitle.trim()) {
      setScheduleError('Please enter a meeting topic');
      setIsScheduling(false);
      return;
    }

    if (!scheduleDate || !scheduleTime) {
      setScheduleError('Please specify a date and time');
      setIsScheduling(false);
      return;
    }

    try {
      const combinedDateTime = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: scheduleTitle,
          scheduledAt: combinedDateTime,
          waitingRoom,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Reset & close
      setScheduleTitle('');
      setScheduleDate('');
      setScheduleTime('');
      setIsScheduleOpen(false);

      // Reload meetings list
      const meetingsRes = await fetch('/api/meetings');
      if (meetingsRes.ok) {
        const meetingsData = await meetingsRes.json();
        setMeetings(meetingsData.meetings);
      }
    } catch (err: any) {
      setScheduleError(err.message || 'Failed to schedule meeting');
    } finally {
      setIsScheduling(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Only filter meetings scheduled for today or active ones
  const todayMeetings = meetings.filter(m => m.status === 'SCHEDULED' || m.status === 'ONGOING');

  return (
    <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto max-w-7xl mx-auto w-full">
      
      {/* Upper Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 items-stretch">
        
        {/* Left Side: Zoom Quick actions buttons */}
        <div className="lg:col-span-7 grid grid-cols-2 gap-4 items-center">
          <button 
            onClick={startInstantMeeting}
            className="flex flex-col items-center justify-center p-6 h-40 rounded-3xl bg-orange-600 hover:bg-orange-500 hover:shadow-lg hover:shadow-orange-600/20 active:scale-[0.98] transition-all text-white font-medium"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 mb-3">
              <Video className="h-8 w-8 text-white" />
            </div>
            <span className="text-base font-bold">New Meeting</span>
            <span className="text-xs text-orange-200 mt-1">Instant screen session</span>
          </button>

          <button 
            onClick={() => setIsJoinOpen(true)}
            className="flex flex-col items-center justify-center p-6 h-40 rounded-3xl bg-blue-600 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-600/20 active:scale-[0.98] transition-all text-white font-medium"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 mb-3">
              <PlusSquare className="h-8 w-8 text-white" />
            </div>
            <span className="text-base font-bold">Join</span>
            <span className="text-xs text-blue-200 mt-1">Join with code</span>
          </button>

          <button 
            onClick={() => setIsScheduleOpen(true)}
            className="flex flex-col items-center justify-center p-6 h-40 rounded-3xl bg-slate-900 border border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 active:scale-[0.98] transition-all text-slate-100 font-medium"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 mb-3 text-blue-500">
              <Calendar className="h-8 w-8" />
            </div>
            <span className="text-base font-bold">Schedule</span>
            <span className="text-xs text-slate-400 mt-1 font-semibold">Plan upcoming session</span>
          </button>

          {/* Personal meeting room option */}
          <button 
            onClick={() => router.push(`/meeting/${user?.id || 'personal-room'}`)}
            className="flex flex-col items-center justify-center p-6 h-40 rounded-3xl bg-slate-900 border border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 active:scale-[0.98] transition-all text-slate-100 font-medium"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 mb-3 text-blue-500">
              <Tv className="h-8 w-8" />
            </div>
            <span className="text-base font-bold">Personal Room</span>
            <span className="text-xs text-slate-400 mt-1">Conduct in your room</span>
          </button>
        </div>

        {/* Right Side: Clock Card */}
        <div className="lg:col-span-5">
          <Card className="h-full border-slate-800/60 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-900 to-slate-900/90 text-white rounded-3xl relative overflow-hidden flex flex-col justify-between p-8 min-h-60 shadow-xl">
            <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl" />
            
            <div>
              <h3 className="text-5xl font-black tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                {formatTime(currentTime)}
              </h3>
              <p className="text-slate-400 text-sm mt-2 font-semibold">
                {formatDate(currentTime)}
              </p>
            </div>

            <div className="border-t border-slate-800/60 pt-6">
              <p className="text-xs text-slate-400 flex items-center">
                <Clock className="h-4 w-4 text-blue-500 mr-2" />
                Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>
            </div>
          </Card>
        </div>

      </div>

      {/* Bottom Area: Today's Scheduled Meetings list */}
      <div className="flex-1 flex flex-col min-h-60">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-200">Scheduled Sessions</h2>
          <Button 
            variant="link" 
            onClick={() => router.push('/dashboard/meetings')}
            className="text-blue-500 hover:text-blue-400 font-semibold p-0"
          >
            Manage Meetings
          </Button>
        </div>

        {todayMeetings.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 p-8 bg-slate-900/10 text-center">
            <VideoOff className="h-10 w-10 text-slate-500 mb-2" />
            <p className="text-slate-400 text-sm">No scheduled meetings</p>
            <Button 
              variant="outline" 
              onClick={() => setIsScheduleOpen(true)}
              className="mt-4 border-slate-800 hover:bg-slate-900 text-slate-300"
            >
              Schedule a Meeting
            </Button>
          </div>
        ) : (
          <ScrollArea className="flex-1 max-h-[300px]">
            <div className="space-y-3">
              {todayMeetings.slice(0, 5).map((meeting) => (
                <div 
                  key={meeting.id} 
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-slate-200">{meeting.title}</p>
                    <div className="flex items-center text-xs text-slate-400 space-x-3">
                      <span>Code: <code className="text-blue-400 font-bold font-mono">{meeting.code}</code></span>
                      {meeting.scheduledAt && (
                        <span>• {new Date(meeting.scheduledAt).toLocaleString()}</span>
                      )}
                    </div>
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
          </ScrollArea>
        )}
      </div>

      {/* ──── DIALOG: JOIN MEETING ──── */}
      <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Join Meeting</DialogTitle>
            <DialogDescription className="text-slate-400">
              Enter the meeting ID or code to connect to the WebRTC video stream.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJoinSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="joinCode" className="text-sm font-semibold text-slate-300">
                Meeting Code
              </Label>
              <Input 
                id="joinCode"
                placeholder="e.g. abc-defg-hij"
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:border-blue-500"
              />
            </div>
            
            {joinError && (
              <p className="text-xs text-red-400 font-semibold">{joinError}</p>
            )}

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setJoinCode('');
                  setJoinError('');
                  setIsJoinOpen(false);
                }}
                className="border-slate-800 hover:bg-slate-800 text-slate-300"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              >
                Join
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──── DIALOG: SCHEDULE MEETING ──── */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Schedule Meeting</DialogTitle>
            <DialogDescription className="text-slate-400">
              Set date and time parameters for your meeting.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="scheduleTitle" className="text-sm font-semibold text-slate-300">
                Topic
              </Label>
              <Input 
                id="scheduleTitle"
                placeholder="e.g. Project Review"
                required
                value={scheduleTitle}
                onChange={(e) => setScheduleTitle(e.target.value)}
                className="border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduleDate" className="text-sm font-semibold text-slate-300">
                  Date
                </Label>
                <Input 
                  id="scheduleDate"
                  type="date"
                  required
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="border-slate-800 bg-slate-950 text-white focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleTime" className="text-sm font-semibold text-slate-300">
                  Time
                </Label>
                <Input 
                  id="scheduleTime"
                  type="time"
                  required
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="border-slate-800 bg-slate-950 text-white focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-slate-200">Waiting Room</Label>
                <p className="text-xs text-slate-400">Only admitted users can join</p>
              </div>
              <input 
                type="checkbox"
                checked={waitingRoom}
                onChange={(e) => setWaitingRoom(e.target.checked)}
                className="h-4 w-4 accent-blue-600 rounded bg-slate-950 border-slate-800 cursor-pointer"
              />
            </div>

            {scheduleError && (
              <p className="text-xs text-red-400 font-semibold">{scheduleError}</p>
            )}

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setScheduleTitle('');
                  setScheduleDate('');
                  setScheduleTime('');
                  setScheduleError('');
                  setIsScheduleOpen(false);
                }}
                className="border-slate-800 hover:bg-slate-800 text-slate-300"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isScheduling}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              >
                {isScheduling ? 'Scheduling...' : 'Schedule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
