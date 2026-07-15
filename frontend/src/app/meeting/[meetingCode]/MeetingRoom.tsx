'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { 
  LiveKitRoom, 
  VideoTrack, 
  useTracks,
  useLocalParticipant,
  RoomAudioRenderer,
  useConnectionState
} from '@livekit/components-react';
import { Room, RoomEvent, Track } from 'livekit-client';
import '@livekit/components-styles';

import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Users, 
  MessageSquare, 
  Smile, 
  PhoneOff, 
  Shield,
  Monitor,
  Square,
  Award,
  Grid,
  WifiOff,
  Brain,
  MoreHorizontal
} from 'lucide-react';
import AskAIPanel from './AskAIPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface MeetingRoomProps {
  meetingCode: string;
  meeting: any;
  user: UserProfile;
  liveKitToken: string | null;
}

interface SocketParticipant {
  socketId: string;
  userId: string;
  name: string;
  micOn: boolean;
  cameraOn: boolean;
  isAdmitted: boolean;
  role?: 'HOST' | 'PARTICIPANT';
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface EmojiReaction {
  id: string;
  senderName: string;
  reaction: string;
}

export default function MeetingRoom({ meetingCode, meeting, user, liveKitToken }: MeetingRoomProps) {
  const router = useRouter();

  // Socket & Sync state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isWaiting, setIsWaiting] = useState(true);
  const [socketParticipants, setSocketParticipants] = useState<SocketParticipant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [activeReactions, setActiveReactions] = useState<EmojiReaction[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState<any>(meeting);

  // Sidebar & Layout toggle state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isAskAIOpen, setIsAskAIOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'gallery' | 'speaker'>('gallery');

  // Leave meeting dialog state
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);

  // Media toggle states
  const [localMicOn, setLocalMicOn] = useState(true);
  const [localCamOn, setLocalCamOn] = useState(true);

  // Media access error states
  const [roomError, setRoomError] = useState<string | null>(null);

  const handleRoomError = (error: Error) => {
    console.error('LiveKit room connection error:', error);
    if (error.name === 'NotAllowedError' || error.message.includes('permission') || error.message.includes('Permission') || error.message.includes('NotAllowedError')) {
      setRoomError('Permission denied: Camera and microphone access are blocked. Please allow browser access in settings to join with media, or continue in view-only mode.');
    } else {
      setRoomError(error.message || 'An error occurred connecting to the WebRTC video engine.');
    }
  };

  const handleJoinViewOnly = () => {
    setLocalCamOn(false);
    setLocalMicOn(false);
    setRoomError(null);
  };

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isHost = meetingDetails?.hostId === user.id;

  // Initialize Socket.io Connection
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';
    const socketClient = io(socketUrl, {
      withCredentials: true,
    });

    setSocket(socketClient);

    socketClient.on('connect', () => {
      console.log('Connected to presence signaling socket:', socketClient.id);
      
      // Join Room
      socketClient.emit('join-room', {
        room: meetingCode,
        userId: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        micOn: localMicOn,
        cameraOn: localCamOn,
      });
    });

    // Handle Waiting Room status
    socketClient.on('waiting-room-status', ({ waiting }: { waiting: boolean }) => {
      setIsWaiting(waiting);
    });

    // Active participants list
    socketClient.on('room-users', (users: SocketParticipant[]) => {
      setSocketParticipants(users);
    });

    // User joined/admitted
    socketClient.on('user-joined', (newUser: SocketParticipant) => {
      setSocketParticipants((prev) => {
        const filtered = prev.filter((p) => p.socketId !== newUser.socketId && p.userId !== newUser.userId);
        return [...filtered, newUser];
      });
    });

    // Notify host about lobby
    socketClient.on('user-waiting', (waitingUser: SocketParticipant) => {
      setSocketParticipants((prev) => {
        const filtered = prev.filter((p) => p.socketId !== waitingUser.socketId && p.userId !== waitingUser.userId);
        return [...filtered, waitingUser];
      });
    });

    // User left
    socketClient.on('user-left', ({ socketId }: { socketId: string }) => {
      setSocketParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
    });

    // Media toggles sync
    socketClient.on('media-state-changed', ({ socketId, mediaType, enabled }: { socketId: string; mediaType: 'mic' | 'camera'; enabled: boolean }) => {
      setSocketParticipants((prev) =>
        prev.map((p) => {
          if (p.socketId === socketId) {
            return {
              ...p,
              micOn: mediaType === 'mic' ? enabled : p.micOn,
              cameraOn: mediaType === 'camera' ? enabled : p.cameraOn,
            };
          }
          return p;
        })
      );
    });

    // Host migrated event
    socketClient.on('host-changed', ({ newHostSocketId, newHostUserId, newHostName }: { newHostSocketId: string; newHostUserId: string; newHostName: string }) => {
      // Log system message in chat
      setChatMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          senderId: 'system',
          senderName: 'System',
          content: `${newHostName} has been assigned as the host of this meeting room.`,
          createdAt: new Date().toISOString(),
        },
      ]);
      
      // Update local meeting cache if possible
      setMeetingDetails((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          hostId: newHostUserId,
        };
      });
    });

    // Real-time Chat message receiver
    socketClient.on('chat:message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    // Real-time emoji reaction receiver
    socketClient.on('chat:reaction', (reaction: EmojiReaction) => {
      setActiveReactions((prev) => [...prev, reaction]);
      
      // Remove reaction floating display bubble after 3 seconds
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3000);
    });

    // Listen for recording changes (from other browser sessions / host commands)
    socketClient.on('recording-changed', ({ recording }: { recording: boolean }) => {
      setIsRecording(recording);
    });

    return () => {
      socketClient.disconnect();
    };
  }, [meetingCode, user.id, user.name, user.avatarUrl]);

  // Handle Send Chat message
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: user.id,
      senderName: user.name,
      content: chatInput.trim(),
      createdAt: new Date().toISOString(),
    };

    socket.emit('chat:message', { 
      room: meetingCode, 
      userId: user.id,
      userName: user.name,
      content: chatInput.trim() 
    });
    setChatInput('');
  };

  // Scroll to chat bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  // Handle Send Reaction
  const handleSendReaction = (emoji: string) => {
    if (!socket) return;
    socket.emit('chat:reaction', { 
      room: meetingCode, 
      userId: user.id,
      userName: user.name,
      reaction: emoji 
    });
  };

  // Admit lobby user
  const handleAdmitParticipant = (socketId: string) => {
    if (!socket) return;
    socket.emit('admit-user', { room: meetingCode, socketId });
  };

  // Remote mute command from host
  const handleRequestMute = (socketId: string) => {
    if (!socket) return;
    socket.emit('mute-user', { room: meetingCode, socketId });
  };

  // Leave meeting & teardown presence session
  const handleLeaveTrigger = () => {
    setIsLeaveDialogOpen(true);
  };

  const executeLeave = () => {
    if (socket) {
      socket.disconnect();
    }
    router.push('/dashboard');
    router.refresh();
  };

  // LiveKit media toggle helper functions
  const handleToggleMic = async (localParticipant: any) => {
    const isEnabled = localParticipant.isMicrophoneEnabled;
    await localParticipant.setMicrophoneEnabled(!isEnabled);
    setLocalMicOn(!isEnabled);
    
    // Broadcast status change to sockets
    if (socket) {
      socket.emit('toggle-media', {
        room: meetingCode,
        mediaType: 'mic',
        enabled: !isEnabled,
      });
    }
  };

  const handleToggleCam = async (localParticipant: any) => {
    const isEnabled = localParticipant.isCameraEnabled;
    await localParticipant.setCameraEnabled(!isEnabled);
    setLocalCamOn(!isEnabled);

    // Broadcast status change to sockets
    if (socket) {
      socket.emit('toggle-media', {
        room: meetingCode,
        mediaType: 'camera',
        enabled: !isEnabled,
      });
    }
  };

  // List of participants inside waiting list and meeting
  const waitingList = socketParticipants.filter((p) => !p.isAdmitted);
  const admittedList = socketParticipants.filter((p) => p.isAdmitted);

  // ──── MEDIA ACCESS ERROR SCREEN ────
  if (roomError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-dark-bg text-white p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-6 bg-dark-surface border border-dark-border p-8 rounded-2xl shadow-2xl animate-fade-in">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger border border-danger/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-8 h-8 animate-pulse">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight font-display text-white">Media Access Denied</h2>
            <p className="text-ink-inverse-muted text-xs leading-relaxed">{roomError}</p>
          </div>
          <div className="flex flex-col space-y-3 pt-2">
            <button 
              onClick={handleJoinViewOnly}
              className="w-full bg-brand hover:bg-brand-hover hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm transition-all duration-150 ease-out text-white font-medium py-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[44px] shadow-sm cursor-pointer"
            >
              Continue in View-Only Mode
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-full border border-dark-border bg-transparent hover:bg-dark-tile text-white transition-colors duration-150 ease-out font-medium py-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[44px] cursor-pointer"
            >
              Retry Permissions
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ──── LOBBY WAITING SCREEN ────
  if (isWaiting && !isHost) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-dark-bg text-white px-4 font-sans relative overflow-hidden">
        {/* Animated pulse background motif */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute h-36 w-36 rounded-full border border-brand/20 bg-brand/5 animate-[ping_4s_infinite_ease-in-out]" />
          <div className="absolute h-72 w-72 rounded-full border border-brand/10 bg-brand/[0.02] animate-[ping_6s_infinite_ease-in-out]" />
        </div>

        <div className="max-w-md w-full text-center space-y-6 relative z-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-subtle text-brand-text border border-brand-light/20">
            <Shield className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight font-display text-white">Waiting Room Active</h2>
            <p className="text-ink-inverse-muted text-sm leading-relaxed">
              The host will let you in shortly. Sit tight, we're securing your WebRTC media connections.
            </p>
          </div>
          <Button 
            onClick={executeLeave}
            className="w-full bg-danger hover:bg-danger-hover text-white font-medium py-2.5 rounded-sm transition-all focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-bg outline-none min-h-[44px]"
          >
            Leave Waiting Room
          </Button>
        </div>
      </div>
    );
  }

  // ──── LIVE MEETING ROOM CONTAINER ────
  return (
    <LiveKitRoom
      video={localCamOn}
      audio={localMicOn}
      token={liveKitToken || undefined}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      onError={handleRoomError}
      data-lk-theme="default"
      className="flex h-screen w-screen bg-dark-bg overflow-hidden text-white"
    >
      <MeetingCallContent
        meetingCode={meetingCode}
        meeting={meetingDetails}
        user={user}
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        setIsParticipantsOpen={setIsParticipantsOpen}
        isAskAIOpen={isAskAIOpen}
        setIsAskAIOpen={setIsAskAIOpen}
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        handleSendChat={handleSendChat}
        chatEndRef={chatEndRef}
        handleSendReaction={handleSendReaction}
        handleLeaveTrigger={handleLeaveTrigger}
        handleToggleMic={handleToggleMic}
        handleToggleCam={handleToggleCam}
        localMicOn={localMicOn}
        localCamOn={localCamOn}
        waitingList={waitingList}
        admittedList={admittedList}
        handleAdmitParticipant={handleAdmitParticipant}
        handleRequestMute={handleRequestMute}
        isRecording={isRecording}
        setIsRecording={setIsRecording}
        isHost={isHost}
        socket={socket}
      />
      
      <RoomAudioRenderer />

      {/* Emoji Reactions Floater overlay */}
      <div className="fixed bottom-28 left-6 z-[999] flex flex-col space-y-2 pointer-events-none">
        {activeReactions.map((r) => (
          <div 
            key={r.id}
            className="flex items-center space-x-1.5 bg-dark-surface/90 border border-dark-border px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg animate-float-up"
          >
            <span className="text-sm">{r.reaction}</span>
            <span className="text-ink-inverse-muted text-[10px] truncate max-w-[80px]">{r.senderName}</span>
          </div>
        ))}
      </div>

      {/* ──── DIALOG: LEAVE MEETING CONFIRMATION ──── */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent className="bg-dark-surface border-dark-border text-white rounded-lg shadow-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-display text-white">Leave Meeting</DialogTitle>
            <DialogDescription className="text-ink-inverse-muted text-sm">
              Are you sure you want to disconnect from this conference tunnel?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-transparent border-none m-0 p-0 pt-4 flex flex-row justify-end gap-2">
            <button 
              type="button" 
              onClick={() => setIsLeaveDialogOpen(false)}
              className="border border-dark-border bg-transparent hover:bg-dark-tile text-white focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface outline-none min-h-[44px] px-6 rounded-lg text-sm font-medium transition-colors duration-150 ease-out cursor-pointer"
            >
              Cancel
            </button>
            <Button 
              type="button"
              onClick={executeLeave}
              className="bg-danger hover:bg-danger-hover text-white font-medium focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface outline-none min-h-[44px]"
            >
              Leave Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LiveKitRoom>
  );
}

// ──── MEETING ROOM VIEWPORT & PANEL CONTROLLER ────
interface MeetingCallContentProps {
  meetingCode: string;
  meeting: any;
  user: UserProfile;
  layoutMode: 'gallery' | 'speaker';
  setLayoutMode: React.Dispatch<React.SetStateAction<'gallery' | 'speaker'>>;
  isChatOpen: boolean;
  setIsChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isParticipantsOpen: boolean;
  setIsParticipantsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAskAIOpen: boolean;
  setIsAskAIOpen: React.Dispatch<React.SetStateAction<boolean>>;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  handleSendChat: (e: React.FormEvent) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  handleSendReaction: (emoji: string) => void;
  handleLeaveTrigger: () => void;
  handleToggleMic: (p: any) => void;
  handleToggleCam: (p: any) => void;
  localMicOn: boolean;
  localCamOn: boolean;
  waitingList: SocketParticipant[];
  admittedList: SocketParticipant[];
  handleAdmitParticipant: (socketId: string) => void;
  handleRequestMute: (socketId: string) => void;
  isRecording: boolean;
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>;
  isHost: boolean;
  socket: Socket | null;
}

function MeetingCallContent({
  meetingCode,
  meeting,
  user,
  layoutMode,
  setLayoutMode,
  isChatOpen,
  setIsChatOpen,
  isParticipantsOpen,
  setIsParticipantsOpen,
  isAskAIOpen,
  setIsAskAIOpen,
  chatMessages,
  chatInput,
  setChatInput,
  handleSendChat,
  chatEndRef,
  handleSendReaction,
  handleLeaveTrigger,
  handleToggleMic,
  handleToggleCam,
  localMicOn,
  localCamOn,
  waitingList,
  admittedList,
  handleAdmitParticipant,
  handleRequestMute,
  isRecording,
  setIsRecording,
  isHost,
  socket,
}: MeetingCallContentProps) {

  // Query camera & screen share tracks
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const localParticipant = useLocalParticipant().localParticipant;
  const connectionState = useConnectionState();

  // Web Speech API for real-time transcription
  const [captions, setCaptions] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || !socket) return;

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const lastResultIndex = event.results.length - 1;
        const text = event.results[lastResultIndex][0].transcript.trim();
        if (text) {
          console.log('Transcribed speech:', text);
          setCaptions(text);
          // Auto clear captions after 4 seconds
          setTimeout(() => setCaptions(''), 4000);

          socket.emit('live-transcription-chunk', {
            room: meetingCode,
            text: `${user.name}: ${text}`
          });
        }
      };

      rec.onerror = (err: any) => {
        console.warn('Speech recognition error:', err.error);
      };

      rec.onend = () => {
        if (localMicOn && socket.connected) {
          try { rec.start(); } catch (e) {}
        }
      };

      recognitionRef.current = rec;
      if (localMicOn) {
        try {
          rec.start();
        } catch (e) {
          console.warn('Failed to start speech recognition:', e);
        }
      }
    } catch (e) {
      console.error('Failed to initialize speech recognition:', e);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [socket, localMicOn, meetingCode, user.name]);

  // Reactively listen to Host's Mute Requests
  useEffect(() => {
    if (!socket || !localParticipant) return;

    const handleMuteRequest = () => {
      console.log('Received remote mute command from Host');
      if (localParticipant.isMicrophoneEnabled) {
        localParticipant.setMicrophoneEnabled(false);
        handleToggleMic(localParticipant);
      }
    };

    socket.on('mute-request', handleMuteRequest);

    return () => {
      socket.off('mute-request', handleMuteRequest);
    };
  }, [socket, localParticipant, handleToggleMic]);

  const [showLayoutHint, setShowLayoutHint] = useState(false);

  const handleLayoutToggle = () => {
    setLayoutMode(layoutMode === 'gallery' ? 'speaker' : 'gallery');
    if (tracks.length === 1) {
      setShowLayoutHint(true);
      setTimeout(() => setShowLayoutHint(false), 4000);
    }
  };

  const [isProcessingRecording, setIsProcessingRecording] = useState(false);

  const handleToggleRecording = async () => {
    if (isProcessingRecording) return;
    setIsProcessingRecording(true);
    try {
      const action = isRecording ? 'stop' : 'start';
      const res = await fetch(`/api/meetings/${meetingCode}/recording/${action}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || `Failed to ${action} recording`);
        return;
      }
      setIsRecording(!isRecording);
    } catch (err) {
      console.error('Error toggling recording:', err);
      alert('Error toggling recording');
    } finally {
      setIsProcessingRecording(false);
    }
  };

  // Active speaker selector for speaker layout
  const activeSpeakerTrack = tracks.find(
    (t) => t.participant.isSpeaking && t.source === Track.Source.Camera
  ) || tracks.find((t) => t.source === Track.Source.Camera && !t.participant.isLocal) || tracks[0];

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-dark-bg text-white relative">
      
      {/* Main Grid Viewport */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-dark-bg">
        
        {/* PREMIUM CONNECTION RECONNECTING STATUS BANNER */}
        {connectionState === 'reconnecting' && (
          <div className="absolute top-16 inset-x-0 bg-danger text-white text-xs font-bold text-center py-2.5 z-40 flex items-center justify-center space-x-2 animate-pulse shadow-md">
            <WifiOff className="h-4 w-4" />
            <span>Connection lost. Reconnecting to meeting...</span>
          </div>
        )}

        {/* Meeting details header */}
        <header className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-dark-bg/90 to-transparent flex items-center justify-between px-6 z-10">
          <div className="flex items-center space-x-3 text-white">
            <span className="font-bold text-xs tracking-wide bg-dark-surface border border-dark-border px-3 py-1.5 rounded-full select-none">
              Topic: {meeting?.title || 'Video Call'}
            </span>
            <span className="text-ink-inverse-muted font-mono text-xs select-all bg-dark-surface border border-dark-border px-3 py-1.5 rounded-full cursor-pointer hover:text-white transition-colors">
              Code: {meetingCode}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleLayoutToggle}
              className="border-dark-border bg-dark-surface/60 hover:bg-dark-tile text-white focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-bg outline-none min-h-[44px] px-4 rounded-sm transition-colors duration-150 ease-out"
            >
              <Grid className="h-4 w-4 mr-2" />
              {layoutMode === 'gallery' ? 'Speaker View' : 'Gallery View'}
            </Button>
          </div>
        </header>

        {showLayoutHint && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-dark-surface border border-dark-border text-white text-xs px-4 py-2.5 rounded-full shadow-lg z-50 animate-fade-in font-medium flex items-center space-x-2">
            <Brain className="h-4 w-4 text-brand animate-pulse" />
            <span>Single participant call: Spotlight view will activate once other users join the room.</span>
          </div>
        )}

        {/* Video Grid */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-6 pt-20 pb-28 overflow-hidden">
          {tracks.length === 0 ? (
            <div className="text-ink-inverse-muted text-sm font-medium animate-pulse select-none">Waiting for other participants...</div>
          ) : (
            <>
              {/* MOBILE SPOTLIGHT + FILMSTRIP VIEW (<768px) */}
              <div className="flex md:hidden flex-col w-full h-full gap-3 overflow-hidden">
                {/* Spotlight Dominant Tile */}
                <div className="flex-1 rounded-lg overflow-hidden bg-dark-tile relative shadow-xl border border-dark-border">
                  {activeSpeakerTrack ? (
                    <ParticipantTile 
                      track={activeSpeakerTrack} 
                      isLocal={activeSpeakerTrack.participant.isLocal} 
                      captions={activeSpeakerTrack.participant.isLocal ? captions : undefined} 
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-ink-inverse-muted text-sm">
                      No feed available
                    </div>
                  )}
                </div>

                {/* Horizontal Filmstrip of other participants */}
                {tracks.length > 1 && (
                  <div className="h-20 flex overflow-x-auto space-x-2 pb-1 scrollbar-thin scrollbar-thumb-dark-border">
                    {tracks
                      .filter((t) => t.participant.identity !== activeSpeakerTrack?.participant.identity)
                      .map((track) => (
                        <div key={track.publication?.trackSid || `${track.participant.identity}-${track.source}`} className="h-full aspect-video rounded-lg overflow-hidden shadow flex-shrink-0 border border-dark-border">
                          <ParticipantTile 
                            track={track} 
                            isLocal={track.participant.isLocal} 
                            captions={track.participant.isLocal ? captions : undefined} 
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* TABLET / DESKTOP VIEWS (>=768px) */}
              <div className="hidden md:flex w-full h-full items-center justify-center">
                {layoutMode === 'gallery' ? (
                  
                  // GALLERY VIEW
                  <div className="flex flex-wrap items-center justify-center gap-4 w-full max-w-6xl mx-auto my-auto">
                    {tracks.map((track) => (
                      <div 
                        key={track.publication?.trackSid || `${track.participant.identity}-${track.source}`} 
                        className={`relative rounded-lg overflow-hidden aspect-video shadow-lg border border-dark-border bg-dark-tile flex-shrink-0 transition-all ${
                          tracks.length === 1 ? 'w-full max-w-4xl max-h-[70vh]' :
                          tracks.length === 2 ? 'w-[calc(50%-8px)] max-w-2xl' :
                          tracks.length <= 4 ? 'w-[calc(50%-8px)] max-w-xl' : 'w-[calc(33.33%-11px)] max-w-md'
                        }`}
                      >
                        <ParticipantTile 
                          track={track} 
                          isLocal={track.participant.isLocal} 
                          captions={track.participant.isLocal ? captions : undefined} 
                        />
                      </div>
                    ))}
                  </div>

                ) : (

                  // SPEAKER VIEW
                  <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl items-center justify-center my-auto">
                    {activeSpeakerTrack && (
                      <div className={`rounded-lg overflow-hidden bg-dark-tile relative shadow-xl border border-dark-border aspect-video max-h-[70vh] flex items-center justify-center transition-all ${
                        tracks.length === 1 ? 'w-full max-w-4xl' : 'flex-1 w-full'
                      }`}>
                        <ParticipantTile 
                          track={activeSpeakerTrack} 
                          isLocal={activeSpeakerTrack.participant.isLocal} 
                          captions={activeSpeakerTrack.participant.isLocal ? captions : undefined} 
                        />
                      </div>
                    )}

                    {tracks.length > 1 && (
                      <ScrollArea className="md:w-60 w-full flex-shrink-0 max-h-[70vh] border border-dark-border/40 rounded-lg p-2 bg-dark-surface/40">
                        <div className="space-y-3 pr-2 flex flex-row md:flex-col gap-3 md:gap-0 md:space-y-3">
                          {tracks
                            .filter((t) => t.participant.identity !== activeSpeakerTrack?.participant.identity)
                            .map((track) => (
                              <div key={track.publication?.trackSid || `${track.participant.identity}-${track.source}`} className="rounded-lg overflow-hidden aspect-video relative shadow border border-dark-border bg-dark-tile w-32 md:w-full flex-shrink-0">
                                <ParticipantTile 
                                  track={track} 
                                  isLocal={track.participant.isLocal} 
                                  captions={track.participant.isLocal ? captions : undefined} 
                                />
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* BOTTOM ACTION BAR */}
        <footer className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-dark-bg/95 to-transparent flex items-center justify-between px-4 md:px-8 z-10 pointer-events-none">
          
          {/* Audio/Video toggles */}
          <div className="flex items-center space-x-2 md:space-x-3 pointer-events-auto">
            <Tooltip>
              <TooltipTrigger 
                onClick={() => localParticipant && handleToggleMic(localParticipant)}
                className={`h-12 w-12 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-bg outline-none ${
                  localMicOn 
                    ? 'bg-white/10 hover:bg-white/15 text-white' 
                    : 'bg-danger hover:brightness-110 text-white'
                }`}
                aria-label={localMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {localMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </TooltipTrigger>
              <TooltipContent className="bg-dark-surface text-white border-dark-border font-sans text-xs">
                {localMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger 
                onClick={() => localParticipant && handleToggleCam(localParticipant)}
                className={`h-12 w-12 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-bg outline-none ${
                  localCamOn 
                    ? 'bg-white/10 hover:bg-white/15 text-white' 
                    : 'bg-danger hover:brightness-110 text-white'
                }`}
                aria-label={localCamOn ? 'Stop Video' : 'Start Video'}
              >
                {localCamOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </TooltipTrigger>
              <TooltipContent className="bg-dark-surface text-white border-dark-border font-sans text-xs">
                {localCamOn ? 'Stop Video' : 'Start Video'}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Center icons tray */}
          <div className="flex items-center space-x-1 sm:space-x-3 bg-dark-surface/95 backdrop-blur px-3 py-1.5 md:px-6 md:py-2 rounded-2xl border border-dark-border shadow-2xl pointer-events-auto">
            
            {/* Participants */}
            <Tooltip>
              <TooltipTrigger 
                onClick={() => {
                  setIsParticipantsOpen(!isParticipantsOpen);
                  setIsChatOpen(false);
                  setIsAskAIOpen(false);
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-sm cursor-pointer min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface outline-none transition-colors duration-150 ease-out ${
                  isParticipantsOpen 
                    ? 'text-brand hover:brightness-110' 
                    : 'text-ink-inverse-muted hover:bg-white/10 hover:text-white'
                }`}
                aria-label="Toggle Participants"
              >
                <Users className="h-5 w-5" />
                <span className="text-[10px] mt-0.5 hidden sm:block font-sans font-medium">Participants</span>
              </TooltipTrigger>
              <TooltipContent className="bg-dark-surface text-white border-dark-border font-sans text-xs">Toggle Participants Panel</TooltipContent>
            </Tooltip>

            {/* Chat */}
            <Tooltip>
              <TooltipTrigger 
                onClick={() => {
                  setIsChatOpen(!isChatOpen);
                  setIsParticipantsOpen(false);
                  setIsAskAIOpen(false);
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-sm cursor-pointer min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface outline-none transition-colors duration-150 ease-out ${
                  isChatOpen 
                    ? 'text-brand hover:brightness-110' 
                    : 'text-ink-inverse-muted hover:bg-white/10 hover:text-white'
                }`}
                aria-label="Toggle Chat"
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-[10px] mt-0.5 hidden sm:block font-sans font-medium">Chat</span>
              </TooltipTrigger>
              <TooltipContent className="bg-dark-surface text-white border-dark-border font-sans text-xs">Toggle Chat Panel</TooltipContent>
            </Tooltip>

            {/* Ask AI Companion - Visible on Desktop/Tablet, nested in More on mobile */}
            <div className="hidden md:block">
              <Tooltip>
                <TooltipTrigger 
                  onClick={() => {
                    setIsAskAIOpen(!isAskAIOpen);
                    setIsChatOpen(false);
                    setIsParticipantsOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-sm cursor-pointer min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface outline-none transition-colors duration-150 ease-out ${
                    isAskAIOpen 
                      ? 'text-brand hover:brightness-110' 
                      : 'text-ink-inverse-muted hover:bg-white/10 hover:text-white'
                  }`}
                  aria-label="Ask AI Companion"
                >
                  <Brain className="h-5 w-5 text-brand" />
                  <span className="text-[10px] mt-0.5 hidden sm:block font-sans font-medium">Ask AI</span>
                </TooltipTrigger>
                <TooltipContent className="bg-dark-surface text-white border-dark-border font-sans text-xs">Ask questions about this meeting</TooltipContent>
              </Tooltip>
            </div>

            {/* Share Screen - Visible on Desktop/Tablet, nested in More on mobile */}
            <div className="hidden md:block">
              <Tooltip>
                <TooltipTrigger 
                  onClick={() => {
                    if (localParticipant) {
                      const isSharing = localParticipant.isScreenShareEnabled;
                      localParticipant.setScreenShareEnabled(!isSharing);
                    }
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-sm cursor-pointer min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface outline-none transition-colors duration-150 ease-out ${
                    localParticipant?.isScreenShareEnabled 
                      ? 'text-brand hover:brightness-110' 
                      : 'text-ink-inverse-muted hover:bg-white/10 hover:text-white'
                  }`}
                  aria-label="Share Screen"
                >
                  <Monitor className="h-5 w-5" />
                  <span className="text-[10px] mt-0.5 hidden sm:block font-sans font-medium">Share Screen</span>
                </TooltipTrigger>
                <TooltipContent className="bg-dark-surface text-white border-dark-border font-sans text-xs">Start / Stop Screen Share</TooltipContent>
              </Tooltip>
            </div>

            {/* Cloud Recording Control - Visible on Desktop/Tablet (Host Only), nested in More on mobile */}
            {isHost && (
              <div className="hidden md:block">
                <Tooltip>
                  <TooltipTrigger 
                    onClick={handleToggleRecording}
                    disabled={isProcessingRecording}
                    className={`flex flex-col items-center justify-center p-2 rounded-sm cursor-pointer min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface outline-none transition-colors duration-150 ease-out ${
                      isRecording 
                        ? 'text-danger hover:brightness-110' 
                        : 'text-ink-inverse-muted hover:bg-white/10 hover:text-white'
                    } ${isProcessingRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label="Toggle Recording"
                  >
                    <Square className="h-5 w-5" />
                    <span className="text-[10px] mt-0.5 hidden sm:block font-sans font-medium">Record</span>
                  </TooltipTrigger>
                  <TooltipContent className="bg-dark-surface text-white border-dark-border font-sans text-xs">
                    {isProcessingRecording ? 'Processing request...' : isRecording ? 'Stop Recording' : 'Start Recording'}
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {/* Reactions Menubar */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex flex-col items-center justify-center p-2 rounded-sm cursor-pointer min-h-[44px] min-w-[44px] text-ink-inverse-muted hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface outline-none transition-colors duration-150 ease-out">
                <Smile className="h-5 w-5" />
                <span className="text-[10px] mt-0.5 hidden sm:block font-sans font-medium">Reactions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="flex items-center space-x-1.5 p-2 bg-dark-surface border border-dark-border shadow-xl rounded-lg">
                {['👍', '👏', '🎉', '❤️', '✋', '👎'].map(emoji => (
                  <button 
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="text-2xl hover:scale-125 transition-transform p-2 rounded hover:bg-dark-tile cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                  >
                    {emoji}
                  </button>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* MOBILE OVERFLOW MENU (...) */}
            <div className="flex md:hidden items-center justify-center p-1">
              <DropdownMenu>
                <DropdownMenuTrigger 
                  className="flex flex-col items-center justify-center p-2 rounded-sm transition-colors cursor-pointer min-h-[44px] min-w-[44px] text-ink-inverse-muted hover:text-white focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface outline-none"
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-5 w-5" />
                  <span className="text-[10px] mt-0.5 hidden sm:block font-sans font-medium">More</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-dark-surface border border-dark-border text-white shadow-xl rounded-lg p-1" align="end">
                  
                  {/* Share Screen */}
                  <DropdownMenuItem 
                    onClick={() => {
                      if (localParticipant) {
                        const isSharing = localParticipant.isScreenShareEnabled;
                        localParticipant.setScreenShareEnabled(!isSharing);
                      }
                    }}
                    className="focus:bg-dark-tile focus:text-white cursor-pointer py-2.5 text-xs flex items-center"
                  >
                    <Monitor className="h-4 w-4 mr-2.5 text-brand" />
                    Share Screen
                  </DropdownMenuItem>

                  {/* Ask AI Companion */}
                  <DropdownMenuItem 
                    onClick={() => {
                      setIsAskAIOpen(!isAskAIOpen);
                      setIsChatOpen(false);
                      setIsParticipantsOpen(false);
                    }}
                    className="focus:bg-dark-tile focus:text-white cursor-pointer py-2.5 text-xs flex items-center"
                  >
                    <Brain className="h-4 w-4 mr-2.5 text-brand" />
                    Ask AI Companion
                  </DropdownMenuItem>

                  {/* Cloud Recording */}
                  {isHost && (
                    <DropdownMenuItem 
                      onClick={handleToggleRecording}
                      disabled={isProcessingRecording}
                      className="focus:bg-dark-tile focus:text-white cursor-pointer py-2.5 text-xs flex items-center"
                    >
                      <Square className={`h-4 w-4 mr-2.5 ${isRecording ? 'text-danger' : 'text-ink-inverse-muted'}`} />
                      {isRecording ? 'Stop Recording' : 'Record to Cloud'}
                    </DropdownMenuItem>
                  )}
                  
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

          </div>

          {/* Leave Button */}
          <Button 
            onClick={handleLeaveTrigger}
            className="pointer-events-auto bg-danger hover:bg-danger-hover active:translate-y-0 active:shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 ease-out text-white font-medium px-4 md:px-6 h-12 rounded-lg flex items-center shadow-lg min-h-[44px] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-bg outline-none"
            aria-label="Leave Meeting"
          >
            <PhoneOff className="h-4 w-4 md:mr-2" />
            <span className="hidden md:block">Leave</span>
          </Button>

        </footer>
      </div>

      {/* Sidebar Slideovers */}
      {(isChatOpen || isParticipantsOpen || isAskAIOpen) && (
        <aside className="fixed inset-0 z-50 md:static md:z-10 w-full md:w-60 lg:w-80 h-full bg-dark-surface flex flex-col md:border-l md:border-dark-border transition-all duration-200 overflow-hidden">
          
          {/* ASK AI PANEL */}
          {isAskAIOpen && (
            <AskAIPanel meetingCode={meetingCode} onClose={() => setIsAskAIOpen(false)} />
          )}

          {/* CHAT PANEL */}
          {isChatOpen && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-dark-border flex items-center justify-between bg-dark-surface">
                <h3 className="font-bold text-white text-sm font-display">Meeting Chat</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsChatOpen(false)} 
                  className="h-8 w-8 rounded-full flex items-center justify-center text-ink-inverse-muted hover:bg-dark-tile hover:text-white p-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface outline-none transition-colors duration-150 ease-out"
                  aria-label="Close Chat Panel"
                >
                  ✕
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4 bg-dark-bg">
                <div className="space-y-4">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-ink-inverse-muted font-medium">
                        <span className="font-bold text-brand">{msg.senderName}</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="bg-dark-surface border border-dark-border px-3 py-2 rounded-lg text-xs text-white leading-normal inline-block max-w-[90%] break-words">
                        {msg.content}
                      </p>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              <form onSubmit={handleSendChat} className="p-4 border-t border-dark-border flex items-center space-x-2 bg-dark-surface">
                <Input 
                  placeholder="Send a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="bg-dark-bg text-white border border-dark-border hover:border-brand-light/35 text-xs py-1.5 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface flex-1 min-h-[44px] transition-colors duration-150 ease-out"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  className="bg-brand hover:bg-brand-hover hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm transition-all duration-150 ease-out text-white min-h-[44px] px-4 font-medium focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none"
                >
                  Send
                </Button>
              </form>
            </div>
          )}

          {/* PARTICIPANTS PANEL */}
          {isParticipantsOpen && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-dark-border flex items-center justify-between bg-dark-surface">
                <h3 className="font-bold text-white text-sm font-display">Participants ({admittedList.length})</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsParticipantsOpen(false)} 
                  className="h-8 w-8 rounded-full flex items-center justify-center text-ink-inverse-muted hover:bg-dark-tile hover:text-white p-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface outline-none transition-colors duration-150 ease-out"
                  aria-label="Close Participants Panel"
                >
                  ✕
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4 bg-dark-bg">
                <div className="space-y-6">
                  
                  {isHost && waitingList.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-brand uppercase tracking-wider font-sans">Waiting Room ({waitingList.length})</p>
                      <div className="space-y-2">
                        {waitingList.map((p) => (
                          <div 
                            key={p.socketId}
                            className="flex items-center justify-between p-2 rounded-lg bg-dark-surface border border-dark-border"
                          >
                            <span className="text-xs font-semibold text-white truncate max-w-[60%] font-sans">{p.name}</span>
                            <Button 
                              size="sm"
                              onClick={() => handleAdmitParticipant(p.socketId)}
                              className="bg-brand hover:bg-brand-hover hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm transition-all duration-150 ease-out text-white text-[10px] px-3 h-8 rounded-sm pointer-events-auto min-h-[32px] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none"
                            >
                              Admit
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-ink-inverse-muted uppercase tracking-wider font-sans">In Meeting</p>
                    <div className="space-y-2">
                      {admittedList.map((p) => (
                        <div key={p.socketId} className="flex items-center justify-between py-1">
                          <div className="flex items-center space-x-2 truncate max-w-[50%]">
                            <Avatar className="h-7 w-7 border border-dark-border text-[10px]">
                              <AvatarFallback className="bg-dark-tile text-white font-bold">
                                {p.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-semibold text-white truncate font-sans">{p.name}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {/* Host control: remote mute */}
                            {isHost && p.userId !== user.id && p.micOn && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRequestMute(p.socketId)}
                                className="h-8 text-[10px] px-3.5 bg-dark-surface border border-dark-border hover:bg-danger text-white rounded-sm cursor-pointer min-h-[32px] transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none"
                              >
                                Mute
                              </Button>
                            )}

                            {/* Audio/Video Indicators */}
                            <div className="flex items-center space-x-1.5 text-ink-inverse-muted">
                              {p.micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5 text-danger" />}
                              {p.cameraOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5 text-danger" />}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </ScrollArea>
            </div>
          )}

        </aside>
      )}

    </div>
  );
}

interface ParticipantTileProps {
  track: any;
  isLocal: boolean;
  captions?: string;
}

function ParticipantTile({ track, isLocal, captions }: ParticipantTileProps) {
  const isCameraEnabled = track.participant.isCameraEnabled;
  const isSpeaking = track.participant.isSpeaking;
  const name = track.participant.name || track.participant.identity;
  const initials = name
    .split(' ')
    .map((n: string) => n.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden bg-dark-bg border border-dark-border shadow-lg group hover:ring-1 hover:ring-white/20 transition-all duration-150 ease-out">
      {isCameraEnabled ? (
        <VideoTrack trackRef={track as any} className="w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-dark-bg via-dark-surface to-dark-bg flex flex-col items-center justify-center p-4">
          <div className="relative">
            {/* Pulsing speak ring */}
            <div className={`absolute -inset-4 rounded-full bg-brand/10 blur-md transition-opacity duration-300 ${isSpeaking ? 'opacity-100 animate-ping' : 'opacity-0'}`} />
            
            <div className={`h-20 w-20 rounded-full flex items-center justify-center bg-gradient-to-tr from-dark-surface to-dark-tile border-2 transition-all duration-300 ${isSpeaking ? 'border-brand shadow-lg shadow-brand/20 scale-105' : 'border-dark-border'}`}>
              <span className="text-white font-extrabold text-2xl tracking-wide font-display">{initials}</span>
            </div>
            
            {/* Mini mic state icon */}
            <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center shadow border ${track.participant.isMicrophoneEnabled ? 'bg-dark-surface border-dark-border text-brand' : 'bg-danger border-danger text-white'}`}>
              {track.participant.isMicrophoneEnabled ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                  <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.957V17.25a.75.75 0 001.5 0v-1.293c2.96-.372 5.25-2.897 5.25-5.957v-.357a.75.75 0 00-1.5 0V10c0 2.485-2.015 4.5-4.5 4.5S5.5 12.485 5.5 10v-.357z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M10 2a3 3 0 00-3 3v4.328l6.758 6.759A5.25 5.25 0 0015 10v-.357a.75.75 0 00-1.5 0V10c0 2.122-1.24 3.955-3.031 4.792L7 11.23V5a3 3 0 013-3h.001zM4 10V9.643a.75.75 0 00-1.5 0V10c0 2.76 1.865 5.084 4.394 5.765l1.107-1.107A4.48 4.48 0 014.5 10zM12 17.25a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM8.5 17.25a.75.75 0 00.75.75h1.5a.75.75 0 000-1.5h-1.5a.75.75 0 00-.75.75z" clipRule="evenodd" />
                  <path d="M2.22 2.22a.75.75 0 011.06 0l14.5 14.5a.75.75 0 11-1.06 1.06L2.22 3.28a.75.75 0 010-1.06z" />
                </svg>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic subtitling captions popup overlay */}
      {captions && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-4/5 text-center z-20 pointer-events-none">
          <div className="inline-block bg-dark-bg/95 border border-dark-border text-white text-xs py-2 px-4 rounded-lg shadow-2xl animate-fade-in font-medium leading-relaxed max-w-full">
            {captions}
          </div>
        </div>
      )}

      {/* Participant name tag */}
      <span className="absolute bottom-3 left-3 bg-dark-bg/70 border border-dark-border px-3 py-1.5 rounded-lg text-xs font-semibold text-white select-none">
        {name} {isLocal ? '(You)' : ''}
      </span>
    </div>
  );
}
