'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MeetingRoom from './MeetingRoom';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export default function MeetingPage() {
  const router = useRouter();
  const params = useParams();
  const meetingCode = params.meetingCode as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [meeting, setMeeting] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeMeeting = async () => {
      try {
        // 1. Authenticate user
        const userRes = await fetch('/api/users/me');
        if (!userRes.ok) {
          throw new Error('Please sign in to join the meeting');
        }
        const userData = await userRes.json();
        setUser(userData.user);

        // 2. Fetch meeting details
        const meetingRes = await fetch(`/api/meetings/${meetingCode}`);
        if (!meetingRes.ok) {
          throw new Error('Meeting not found or invalid meeting code');
        }
        const meetingData = await meetingRes.json();
        setMeeting(meetingData.meeting);

        // 3. Join meeting (adds participant in DB and returns LiveKit token)
        const joinRes = await fetch(`/api/meetings/${meetingCode}/join`, {
          method: 'POST',
        });
        const joinData = await joinRes.json();
        
        if (!joinRes.ok) {
          throw new Error(joinData.error || 'Failed to join meeting');
        }

        // LiveKit WebRTC Token
        setToken(joinData.liveKitToken || null);
      } catch (err: any) {
        setError(err.message || 'An error occurred joining the meeting');
      } finally {
        setIsLoading(false);
      }
    };

    if (meetingCode) {
      initializeMeeting();
    }
  }, [meetingCode, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-dark-bg text-white font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="text-ink-inverse-muted text-sm font-medium">Securing connection to meeting...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-dark-bg text-white p-4 font-sans">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger border border-danger/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight font-display">Connection Failed</h2>
            <p className="text-ink-inverse-muted text-sm">{error}</p>
          </div>
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full bg-brand hover:bg-brand-hover text-white font-medium py-2.5 rounded-sm transition-all focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[44px] shadow-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <MeetingRoom 
      meetingCode={meetingCode} 
      meeting={meeting} 
      user={user!} 
      liveKitToken={token} 
    />
  );
}
