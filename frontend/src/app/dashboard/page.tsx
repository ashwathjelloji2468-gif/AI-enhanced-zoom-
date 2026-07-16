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

  const startPersonalRoom = async () => {
    try {
      const response = await fetch('/api/meetings/personal', {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Redirect to meeting room
      router.push(`/meeting/${data.code}`);
    } catch (err: any) {
      alert(err.message || 'Could not start personal room');
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
    <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto max-w-7xl mx-auto w-full text-slate-800 animate-in fade-in duration-300">
      
      {/* Upper Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 items-stretch">
        
        {/* Left Side: Zoom Quick actions buttons */}
        <div className="lg:col-span-7 grid grid-cols-2 gap-4 items-center">
          <button 
            onClick={startInstantMeeting}
            aria-label="Start a new instant meeting"
            className="flex flex-col items-center justify-center p-6 h-40 rounded-3xl bg-gradient-to-br from-brand to-brand-hover active:scale-[0.99] hover:-translate-y-1 shadow-premium hover:shadow-brand/20 transition-all duration-300 ease-out text-white font-medium focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none cursor-pointer group"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 mb-3 transition-transform group-hover:scale-105">
              <Video className="h-7 w-7 text-white" />
            </div>
            <span className="text-base font-bold font-display">New Meeting</span>
            <span className="text-xs text-brand-subtle mt-1 font-sans">Start instantly</span>
          </button>
 
          <button 
            onClick={() => setIsJoinOpen(true)}
            aria-label="Join a meeting using a code"
            className="flex flex-col items-center justify-center p-6 h-40 rounded-3xl border border-slate-200/80 bg-white hover:border-brand/30 hover:bg-brand/5 hover:text-brand active:scale-[0.99] hover:-translate-y-1 shadow-premium hover:shadow-premium-hover transition-all duration-300 ease-out text-slate-700 font-medium focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none cursor-pointer group"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-subtle text-brand mb-3 transition-all duration-300 group-hover:bg-brand group-hover:text-white">
              <PlusSquare className="h-7 w-7" />
            </div>
            <span className="text-base font-bold font-display">Join</span>
            <span className="text-xs text-slate-400 mt-1 font-sans">Use meeting ID</span>
          </button>
 
          <button 
            onClick={() => setIsScheduleOpen(true)}
            aria-label="Schedule an upcoming meeting"
            className="flex flex-col items-center justify-center p-6 h-40 rounded-3xl border border-slate-200/80 bg-white hover:border-brand/30 hover:bg-brand/5 hover:text-brand active:scale-[0.99] hover:-translate-y-1 shadow-premium hover:shadow-premium-hover transition-all duration-300 ease-out text-slate-700 font-medium focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none cursor-pointer group"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-subtle text-brand mb-3 transition-all duration-300 group-hover:bg-brand group-hover:text-white">
              <Calendar className="h-7 w-7" />
            </div>
            <span className="text-base font-bold font-display">Schedule</span>
            <span className="text-xs text-slate-400 mt-1 font-sans">Plan a session</span>
          </button>
 
          <button 
            onClick={startPersonalRoom}
            aria-label="Enter your personal meeting room"
            className="flex flex-col items-center justify-center p-6 h-40 rounded-3xl border border-slate-200/80 bg-white hover:border-brand/30 hover:bg-brand/5 hover:text-brand active:scale-[0.99] hover:-translate-y-1 shadow-premium hover:shadow-premium-hover transition-all duration-300 ease-out text-slate-700 font-medium focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none cursor-pointer group"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-subtle text-brand mb-3 transition-all duration-300 group-hover:bg-brand group-hover:text-white">
              <Tv className="h-7 w-7" />
            </div>
            <span className="text-base font-bold font-display">Personal Room</span>
            <span className="text-xs text-slate-400 mt-1 font-sans">Your fixed space</span>
          </button>
        </div>
 
        {/* Right Side: Clock Card */}
        <div className="lg:col-span-5">
          <Card className="h-full border-slate-200/85 bg-white text-slate-800 rounded-3xl shadow-premium hover:shadow-premium-hover transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between p-8 min-h-60 relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-brand/5 blur-3xl pointer-events-none group-hover:bg-brand/10 transition-colors duration-300" />
            
            <div>
              <h3 className="text-5xl font-bold tracking-tight text-slate-800 font-display select-none">
                {formatTime(currentTime)}
              </h3>
              <p className="text-slate-400 text-sm mt-2.5 font-semibold font-sans">
                {formatDate(currentTime)}
              </p>
            </div>
 
            <div className="border-t border-slate-100 pt-6 mt-6">
              <p className="text-xs text-slate-400 flex items-center font-medium font-sans">
                <Clock className="h-4 w-4 text-brand mr-2" />
                Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>
            </div>
          </Card>
        </div>
 
      </div>
 
      {/* Bottom Area: Today's Scheduled Meetings list */}
      <div className="flex-1 flex flex-col min-h-60">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800 font-display">Scheduled Sessions</h2>
          <Button 
            variant="link" 
            onClick={() => router.push('/dashboard/meetings')}
            className="text-brand hover:text-brand-hover font-bold p-0 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none"
          >
            Manage Meetings
          </Button>
        </div>

        {todayMeetings.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 p-12 bg-white text-center shadow-premium">
            <VideoOff className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold text-sm font-sans">No meetings yet. Create one to get started.</p>
            <Button 
              variant="outline" 
              onClick={() => setIsScheduleOpen(true)}
              className="mt-5 border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[40px] rounded-2xl shadow-sm hover:shadow-premium transition-all duration-200"
            >
              Schedule a Meeting
            </Button>
          </div>
        ) : (
          <ScrollArea className="flex-1 max-h-[300px]">
            <div className="space-y-3.5">
              {todayMeetings.slice(0, 5).map((meeting) => (
                <div 
                  key={meeting.id} 
                  className="flex items-center justify-between p-5 rounded-3xl border border-slate-200/60 bg-white hover:bg-slate-50/50 shadow-premium hover:shadow-premium-hover transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="space-y-1.5">
                    <p className="font-bold text-slate-800 text-[15px] font-sans">{meeting.title}</p>
                    <div className="flex items-center text-xs text-slate-400 space-x-3 font-medium">
                      <span>Code: <code className="bg-slate-100 text-brand font-bold font-mono px-2 py-0.5 rounded-lg text-xs">{meeting.code}</code></span>
                      {meeting.scheduledAt && (
                        <span>• {new Date(meeting.scheduledAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[38px] w-10 p-0 rounded-xl transition-colors duration-200"
                      onClick={() => copyToClipboard(meeting.code)}
                      aria-label={`Copy meeting code for ${meeting.title}`}
                    >
                      {copiedCode === meeting.code ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Clipboard className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-brand hover:bg-brand-hover text-white font-semibold focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[38px] px-5 rounded-xl shadow-premium shadow-brand/10 hover:shadow-brand/20 transition-all duration-200"
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
        <DialogContent className="bg-white border-slate-200/80 text-slate-800 rounded-3xl shadow-premium p-6 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 font-display">Join Meeting</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm font-medium">
              Enter the meeting ID or code to connect to the WebRTC video stream.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJoinSubmit} className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="joinCode" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Meeting Code
              </Label>
              <Input 
                id="joinCode"
                placeholder="e.g. abc-defg-hij"
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="bg-slate-50/50 text-slate-800 border-slate-200 focus-visible:ring-brand focus-visible:ring-offset-2 min-h-[42px] px-4 rounded-2xl shadow-sm transition-all duration-200"
              />
            </div>
            
            {joinError && (
              <p className="text-xs text-rose-500 font-bold">{joinError}</p>
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
                className="border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[40px] rounded-2xl transition-colors duration-200"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-brand hover:bg-brand-hover text-white font-semibold focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[40px] rounded-2xl shadow-premium shadow-brand/10 hover:shadow-brand/20 transition-all duration-200"
              >
                Join
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──── DIALOG: SCHEDULE MEETING ──── */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="bg-white border-slate-200/80 text-slate-800 max-w-md rounded-3xl shadow-premium p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 font-display">Schedule Meeting</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm font-medium">
              Set date and time parameters for your meeting.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="scheduleTitle" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Topic
              </Label>
              <Input 
                id="scheduleTitle"
                placeholder="e.g. Project Review"
                required
                value={scheduleTitle}
                onChange={(e) => setScheduleTitle(e.target.value)}
                className="bg-slate-50/50 text-slate-800 border-slate-200 focus-visible:ring-brand focus-visible:ring-offset-2 min-h-[42px] px-4 rounded-2xl shadow-sm transition-all duration-200"
              />
            </div>
 
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduleDate" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Date
                </Label>
                <Input 
                  id="scheduleDate"
                  type="date"
                  required
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="bg-slate-50/50 text-slate-800 border-slate-200 focus-visible:ring-brand focus-visible:ring-offset-2 min-h-[42px] px-4 rounded-2xl shadow-sm transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleTime" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Time
                </Label>
                <Input 
                  id="scheduleTime"
                  type="time"
                  required
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="bg-slate-50/50 text-slate-800 border-slate-200 focus-visible:ring-brand focus-visible:ring-offset-2 min-h-[42px] px-4 rounded-2xl shadow-sm transition-all duration-200"
                />
              </div>
            </div>
 
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-slate-700">Waiting Room</Label>
                <p className="text-xs text-slate-400 font-medium">Only admitted users can join</p>
              </div>
              <input 
                type="checkbox"
                checked={waitingRoom}
                onChange={(e) => setWaitingRoom(e.target.checked)}
                className="h-4.5 w-4.5 accent-brand rounded-lg border-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none"
              />
            </div>
 
            {scheduleError && (
              <p className="text-xs text-rose-500 font-bold">{scheduleError}</p>
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
                className="border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[40px] rounded-2xl transition-colors duration-200"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isScheduling}
                className="bg-brand hover:bg-brand-hover text-white font-semibold focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[40px] rounded-2xl shadow-premium shadow-brand/10 hover:shadow-brand/20 transition-all duration-200"
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
