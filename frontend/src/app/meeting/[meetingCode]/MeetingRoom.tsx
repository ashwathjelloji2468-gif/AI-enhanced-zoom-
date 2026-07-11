'use strict';
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
          id: crypto.randomUUID(),
          senderId: 'system',
          senderName: 'System',
          content: `${newHostName} has been assigned as the new Host.`,
          createdAt: new Date().toISOString(),
        }
      ]);

      // Update state for host evaluation
      setMeetingDetails((prev: any) => {
        if (!prev) return prev;
        return { ...prev, hostId: newHostUserId };
      });

      // Update local participants array roles
      setSocketParticipants((prev) =>
        prev.map((p) => {
          if (p.userId === newHostUserId) {
            return { ...p, role: 'HOST' };
          }
          return p;
        })
      );
    });

    // Meeting ended by host
    socketClient.on('meeting-ended', () => {
      alert('The host has ended this meeting.');
      router.push('/dashboard');
    });

    // Chat messages
    socketClient.on('chat:message', (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
    });

    // Reactions
    socketClient.on('chat:reaction', (reaction: EmojiReaction) => {
      setActiveReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 4000);
    });

    return () => {
      socketClient.disconnect();
    };
  }, [meetingCode, user, router]);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  // Media toggles
  const handleToggleMic = (localParticipant: any) => {
    const isEnabled = localParticipant.isMicrophoneEnabled;
    localParticipant.setMicrophoneEnabled(!isEnabled);
    setLocalMicOn(!isEnabled);

    if (socket) {
      socket.emit('toggle-media', {
        room: meetingCode,
        mediaType: 'mic',
        enabled: !isEnabled,
      });
    }
  };

  const handleToggleCam = (localParticipant: any) => {
    const isEnabled = localParticipant.isCameraEnabled;
    localParticipant.setCameraEnabled(!isEnabled);
    setLocalCamOn(!isEnabled);

    if (socket) {
      socket.emit('toggle-media', {
        room: meetingCode,
        mediaType: 'camera',
        enabled: !isEnabled,
      });
    }
  };

  // Host Admits participant
  const handleAdmitParticipant = (targetSocketId: string) => {
    if (socket) {
      socket.emit('admit-participant', {
        room: meetingCode,
        targetSocketId,
      });
      setSocketParticipants((prev) =>
        prev.map((p) => {
          if (p.socketId === targetSocketId) {
            return { ...p, isAdmitted: true };
          }
          return p;
        })
      );
    }
  };

  // Host Mutes remote participant
  const handleRequestMute = (targetSocketId: string) => {
    if (socket) {
      socket.emit('request-mute', {
        room: meetingCode,
        targetSocketId,
      });
    }
  };

  // Send Chat
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;

    socket.emit('chat:message', {
      room: meetingCode,
      userId: user.id,
      userName: user.name,
      content: chatInput.trim(),
    });

    setChatInput('');
  };

  // Send Reaction
  const handleSendReaction = (emoji: string) => {
    if (!socket) return;
    socket.emit('chat:reaction', {
      room: meetingCode,
      userId: user.id,
      userName: user.name,
      reaction: emoji,
    });
  };

  // Leave room triggers
  const handleLeaveTrigger = () => {
    if (isHost) {
      setIsLeaveDialogOpen(true);
    } else {
      handleLeaveMeeting();
    }
  };

  // Standard Leave Meeting
  const handleLeaveMeeting = () => {
    if (socket) {
      socket.emit('leave-room', { room: meetingCode });
    }
    router.push('/dashboard');
  };

  // End Meeting for All
  const handleEndMeetingForAll = () => {
    if (socket) {
      socket.emit('end-meeting', { room: meetingCode });
    }
    router.push('/dashboard');
  };

  const waitingList = socketParticipants.filter((p) => !p.isAdmitted);
  const admittedList = socketParticipants.filter((p) => p.isAdmitted);

  // Pre-join Lobby waiting view
  if (isWaiting && !isHost) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white p-4">
        <Card className="max-w-md w-full border-slate-800 bg-slate-900/60 backdrop-blur-xl p-8 text-center space-y-6 shadow-2xl">
          <div className="flex justify-center">
            <div className="h-16 w-16 animate-pulse rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Shield className="h-8 w-8 animate-spin" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black">Waiting Room</h2>
            <p className="text-slate-400 text-sm">
              Please wait, the meeting host will admit you shortly.
            </p>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Meeting</p>
            <p className="text-base font-bold text-slate-300 mt-0.5">{meeting?.title || 'Untitled Meeting'}</p>
          </div>
          <Button 
            onClick={() => router.push('/dashboard')}
            variant="outline" 
            className="w-full border-slate-800 hover:bg-slate-800 text-slate-300"
          >
            Cancel
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 relative overflow-hidden">
      
      {/* Reactions floating overlay */}
      <div className="absolute bottom-28 left-6 z-30 space-y-2 pointer-events-none">
        {activeReactions.map((r) => (
          <div 
            key={r.id} 
            className="flex items-center space-x-2 bg-slate-900/90 backdrop-blur border border-slate-800 px-4 py-2.5 rounded-full shadow-lg animate-bounce"
          >
            <span className="text-xs font-semibold text-slate-300">{r.senderName}</span>
            <span className="text-2xl">{r.reaction}</span>
          </div>
        ))}
      </div>

      <LiveKitRoom
        token={liveKitToken || undefined}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880'}
        connect={liveKitToken !== null}
        audio={true}
        video={true}
        className="flex-1 flex flex-col h-full"
      >
        <MeetingCallContent 
          meetingCode={meetingCode}
          meeting={meeting}
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
      </LiveKitRoom>

      {/* ──── DIALOG: LEAVE MEETING OPTIONS (HOST ONLY) ──── */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white text-center">Leave Meeting</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs text-center mt-1">
              Do you want to end this meeting for everyone, or leave and assign a new host?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-3 pt-4">
            <Button 
              onClick={handleEndMeetingForAll}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5"
            >
              End Meeting for All
            </Button>
            <Button 
              onClick={() => {
                setIsLeaveDialogOpen(false);
                handleLeaveMeeting();
              }}
              variant="outline"
              className="w-full border-slate-800 hover:bg-slate-800 text-slate-200 py-2.5"
            >
              Leave Meeting
            </Button>
            <Button 
              onClick={() => setIsLeaveDialogOpen(false)}
              variant="ghost"
              className="w-full text-slate-400 hover:text-white py-2"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Inner components consuming LiveKit hooks
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
        rec.start();
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
    <div className="flex-1 flex h-full overflow-hidden">
      
      {/* Main Grid Viewport */}
      <div className="flex-1 flex flex-col h-full bg-black relative">
        
        {/* PREMIUM CONNECTION RECONNECTING STATUS BANNER */}
        {connectionState === 'reconnecting' && (
          <div className="absolute top-16 inset-x-0 bg-yellow-600/90 text-white text-xs font-bold text-center py-2.5 z-40 flex items-center justify-center space-x-2 animate-pulse shadow-md">
            <WifiOff className="h-4 w-4" />
            <span>Connection lost. Reconnecting to meeting...</span>
          </div>
        )}

        {/* Meeting details header */}
        <header className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-10">
          <div className="flex items-center space-x-3 text-white">
            <span className="font-bold text-xs tracking-wide bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
              Topic: {meeting?.title || 'Video Call'}
            </span>
            <span className="text-slate-400 font-mono text-xs select-all bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full cursor-pointer">
              Code: {meetingCode}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setLayoutMode(layoutMode === 'gallery' ? 'speaker' : 'gallery')}
              className="border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200"
            >
              <Grid className="h-4 w-4 mr-2" />
              {layoutMode === 'gallery' ? 'Speaker View' : 'Gallery View'}
            </Button>
          </div>
        </header>

        {/* Video Grid */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-6 pt-20 pb-28 overflow-hidden">
          {tracks.length === 0 ? (
            <div className="text-slate-500 text-sm">Waiting for other participants...</div>
          ) : (
            <>
              {/* MOBILE SPOTLIGHT + FILMSTRIP VIEW (<768px) */}
              <div className="flex md:hidden flex-col w-full h-full gap-3 overflow-hidden">
                {/* Spotlight Dominant Tile */}
                <div className="flex-1 rounded-2xl overflow-hidden bg-slate-900 relative shadow-xl border border-slate-800">
                  {activeSpeakerTrack ? (
                    <ParticipantTile 
                      track={activeSpeakerTrack} 
                      isLocal={activeSpeakerTrack.participant.isLocal} 
                      captions={activeSpeakerTrack.participant.isLocal ? captions : undefined} 
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                      No feed available
                    </div>
                  )}
                </div>

                {/* Horizontal Filmstrip of other participants */}
                {tracks.length > 1 && (
                  <div className="h-20 flex overflow-x-auto space-x-2 pb-1 scrollbar-thin scrollbar-thumb-slate-800">
                    {tracks
                      .filter((t) => t.participant.identity !== activeSpeakerTrack?.participant.identity)
                      .map((track) => (
                        <div key={track.participant.identity} className="h-full aspect-video rounded-xl overflow-hidden shadow flex-shrink-0">
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
                  <div className={`grid gap-4 w-full h-full max-w-5xl items-center justify-center ${
                    tracks.length === 1 ? 'grid-cols-1 max-w-2xl' :
                    tracks.length === 2 ? 'grid-cols-2' :
                    tracks.length <= 4 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'
                  }`}>
                    {tracks.map((track) => (
                      <div key={track.participant.identity} className="relative rounded-2xl overflow-hidden aspect-video shadow-lg">
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
                  <div className="flex flex-col md:flex-row gap-4 w-full h-full max-w-6xl">
                    {activeSpeakerTrack && (
                      <div className="flex-1 rounded-2xl overflow-hidden bg-slate-900 relative shadow-xl border border-slate-800">
                        <ParticipantTile 
                          track={activeSpeakerTrack} 
                          isLocal={activeSpeakerTrack.participant.isLocal} 
                          captions={activeSpeakerTrack.participant.isLocal ? captions : undefined} 
                        />
                      </div>
                    )}

                    {tracks.length > 1 && (
                      <ScrollArea className="md:w-60 flex flex-col gap-2 max-h-full">
                        <div className="space-y-3 pr-2">
                          {tracks
                            .filter((t) => t.participant.identity !== activeSpeakerTrack?.participant.identity)
                            .map((track) => (
                              <div key={track.participant.identity} className="rounded-xl overflow-hidden aspect-video relative shadow">
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
        <footer className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black to-transparent flex items-center justify-between px-4 md:px-8 z-10">
          
          {/* Audio/Video toggles */}
          <div className="flex items-center space-x-2 md:space-x-3">
            <Tooltip>
              <TooltipTrigger 
                onClick={() => localParticipant && handleToggleMic(localParticipant)}
                className={`h-11 w-11 md:h-12 md:w-12 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-all ${
                  localMicOn 
                    ? 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800' 
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
                aria-label={localMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {localMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-slate-200 border-slate-800">
                {localMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger 
                onClick={() => localParticipant && handleToggleCam(localParticipant)}
                className={`h-11 w-11 md:h-12 md:w-12 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-all ${
                  localCamOn 
                    ? 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800' 
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
                aria-label={localCamOn ? 'Stop Video' : 'Start Video'}
              >
                {localCamOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-slate-200 border-slate-800">
                {localCamOn ? 'Stop Video' : 'Start Video'}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Center icons tray */}
          <div className="flex items-center space-x-1 sm:space-x-3 bg-slate-900/90 backdrop-blur px-3 py-1.5 md:px-6 md:py-2 rounded-2xl border border-slate-850 shadow-2xl">
            
            {/* Participants */}
            <Tooltip>
              <TooltipTrigger 
                onClick={() => {
                  setIsParticipantsOpen(!isParticipantsOpen);
                  setIsChatOpen(false);
                  setIsAskAIOpen(false);
                }}
                className={`text-slate-400 hover:text-white flex flex-col items-center justify-center p-2 rounded-lg transition-colors cursor-pointer min-h-[40px] min-w-[40px] ${
                  isParticipantsOpen ? 'text-blue-500 hover:text-blue-400' : ''
                }`}
                aria-label="Toggle Participants"
              >
                <Users className="h-5 w-5" />
                <span className="text-[10px] mt-1 hidden sm:block">Participants</span>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-slate-200 border-slate-800">Toggle Participants Panel</TooltipContent>
            </Tooltip>

            {/* Chat */}
            <Tooltip>
              <TooltipTrigger 
                onClick={() => {
                  setIsChatOpen(!isChatOpen);
                  setIsParticipantsOpen(false);
                  setIsAskAIOpen(false);
                }}
                className={`text-slate-400 hover:text-white flex flex-col items-center justify-center p-2 rounded-lg transition-colors cursor-pointer min-h-[40px] min-w-[40px] ${
                  isChatOpen ? 'text-blue-500 hover:text-blue-400' : ''
                }`}
                aria-label="Toggle Chat"
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-[10px] mt-1 hidden sm:block">Chat</span>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-slate-200 border-slate-800">Toggle Chat Panel</TooltipContent>
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
                  className={`text-slate-400 hover:text-white flex flex-col items-center justify-center p-2 rounded-lg transition-colors cursor-pointer min-h-[40px] min-w-[40px] ${
                    isAskAIOpen ? 'text-indigo-400 hover:text-indigo-305' : ''
                  }`}
                  aria-label="Ask AI Companion"
                >
                  <Brain className="h-5 w-5 text-indigo-400" />
                  <span className="text-[10px] mt-1 hidden sm:block">Ask AI</span>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-slate-200 border-slate-800">Ask questions about this meeting</TooltipContent>
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
                  className="text-slate-400 hover:text-white flex flex-col items-center justify-center p-2 rounded-lg transition-colors cursor-pointer min-h-[40px] min-w-[40px]"
                  aria-label="Share Screen"
                >
                  <Monitor className="h-5 w-5 text-green-500" />
                  <span className="text-[10px] mt-1 hidden sm:block">Share Screen</span>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-slate-200 border-slate-800">Start / Stop Screen Share</TooltipContent>
              </Tooltip>
            </div>

            {/* Cloud Recording Control - Visible on Desktop/Tablet (Host Only), nested in More on mobile */}
            {isHost && (
              <div className="hidden md:block">
                <Tooltip>
                  <TooltipTrigger 
                    onClick={handleToggleRecording}
                    disabled={isProcessingRecording}
                    className={`text-slate-400 hover:text-white flex flex-col items-center justify-center p-2 rounded-lg transition-colors cursor-pointer min-h-[40px] min-w-[40px] ${
                      isRecording ? 'text-red-500 hover:text-red-400' : ''
                    } ${isProcessingRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label="Toggle Recording"
                  >
                    <Square className="h-5 w-5" />
                    <span className="text-[10px] mt-1 hidden sm:block">Record</span>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 text-slate-200 border-slate-800">
                    {isProcessingRecording ? 'Processing request...' : isRecording ? 'Stop Recording' : 'Start Recording'}
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {/* Reactions Menubar */}
            <DropdownMenu>
              <DropdownMenuTrigger className="text-slate-400 hover:text-white flex flex-col items-center justify-center p-2 rounded-lg transition-colors cursor-pointer min-h-[40px] min-w-[40px]">
                <Smile className="h-5 w-5" />
                <span className="text-[10px] mt-1 hidden sm:block">Reactions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="flex items-center space-x-1.5 p-2 bg-slate-900 border-slate-800 shadow-xl rounded-xl">
                {['👍', '👏', '🎉', '❤️', '✋', '👎'].map(emoji => (
                  <button 
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="text-2xl hover:scale-125 transition-transform p-1.5 rounded hover:bg-slate-800 cursor-pointer"
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
                  className="text-slate-400 hover:text-white flex flex-col items-center justify-center p-2 rounded-lg transition-colors cursor-pointer min-h-[40px] min-w-[40px]"
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-5 w-5" />
                  <span className="text-[10px] mt-1 hidden sm:block">More</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-slate-900 border-slate-800 text-slate-100 shadow-xl rounded-xl" align="end">
                  
                  {/* Share Screen */}
                  <DropdownMenuItem 
                    onClick={() => {
                      if (localParticipant) {
                        const isSharing = localParticipant.isScreenShareEnabled;
                        localParticipant.setScreenShareEnabled(!isSharing);
                      }
                    }}
                    className="focus:bg-slate-800 focus:text-white cursor-pointer py-2.5 text-xs flex items-center"
                  >
                    <Monitor className="h-4 w-4 mr-2.5 text-green-500" />
                    Share Screen
                  </DropdownMenuItem>

                  {/* Ask AI Companion */}
                  <DropdownMenuItem 
                    onClick={() => {
                      setIsAskAIOpen(!isAskAIOpen);
                      setIsChatOpen(false);
                      setIsParticipantsOpen(false);
                    }}
                    className="focus:bg-slate-800 focus:text-white cursor-pointer py-2.5 text-xs flex items-center"
                  >
                    <Brain className="h-4 w-4 mr-2.5 text-indigo-400" />
                    Ask AI Companion
                  </DropdownMenuItem>

                  {/* Cloud Recording */}
                  {isHost && (
                    <DropdownMenuItem 
                      onClick={handleToggleRecording}
                      disabled={isProcessingRecording}
                      className="focus:bg-slate-800 focus:text-white cursor-pointer py-2.5 text-xs flex items-center"
                    >
                      <Square className={`h-4 w-4 mr-2.5 ${isRecording ? 'text-red-500' : 'text-slate-400'}`} />
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
            className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 md:px-6 h-11 md:h-12 rounded-xl flex items-center shadow-lg shadow-red-600/25 active:scale-[0.98] transition-all min-h-[44px]"
            aria-label="Leave Meeting"
          >
            <PhoneOff className="h-4 w-4 md:mr-2" />
            <span className="hidden md:block">Leave</span>
          </Button>

        </footer>
      </div>

      {/* Sidebar Slideovers */}
      {(isChatOpen || isParticipantsOpen || isAskAIOpen) && (
        <aside className="fixed inset-0 z-50 md:static md:z-10 w-full md:w-60 lg:w-80 h-full bg-slate-900 flex flex-col md:border-l md:border-slate-800 transition-all duration-200">
          
          {/* ASK AI PANEL */}
          {isAskAIOpen && (
            <AskAIPanel meetingCode={meetingCode} onClose={() => setIsAskAIOpen(false)} />
          )}

          {/* CHAT PANEL */}
          {isChatOpen && (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">Meeting Chat</h3>
                <Button variant="ghost" size="sm" onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white">✕</Button>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                        <span className="font-bold text-blue-400">{msg.senderName}</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="bg-slate-950/80 border border-slate-850 px-3 py-2 rounded-xl text-xs text-slate-200 leading-normal inline-block max-w-[90%] break-words">
                        {msg.content}
                      </p>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              <form onSubmit={handleSendChat} className="p-4 border-t border-slate-800 flex items-center space-x-2">
                <Input 
                  placeholder="Send a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="border-slate-800 bg-slate-950 text-white text-xs py-1.5 focus:border-blue-500 flex-1"
                />
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">Send</Button>
              </form>
            </div>
          )}

          {/* PARTICIPANTS PANEL */}
          {isParticipantsOpen && (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">Participants ({admittedList.length})</h3>
                <Button variant="ghost" size="sm" onClick={() => setIsParticipantsOpen(false)} className="text-slate-400 hover:text-white">✕</Button>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                  
                  {isHost && waitingList.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Waiting Room ({waitingList.length})</p>
                      <div className="space-y-2">
                        {waitingList.map((p) => (
                          <div 
                            key={p.socketId}
                            className="flex items-center justify-between p-2 rounded-xl bg-orange-950/20 border border-orange-500/10"
                          >
                            <span className="text-xs font-semibold text-slate-300 truncate max-w-[60%]">{p.name}</span>
                            <Button 
                              size="sm"
                              onClick={() => handleAdmitParticipant(p.socketId)}
                              className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] px-2 h-7 rounded-lg pointer-events-auto"
                            >
                              Admit
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">In Meeting</p>
                    <div className="space-y-2">
                      {admittedList.map((p) => (
                        <div key={p.socketId} className="flex items-center justify-between py-1">
                          <div className="flex items-center space-x-2 truncate max-w-[50%]">
                            <Avatar className="h-7 w-7 border border-slate-800 text-[10px]">
                              <AvatarFallback className="bg-slate-800 text-slate-300 font-bold">
                                {p.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-semibold text-slate-200 truncate">{p.name}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {/* Host control: remote mute */}
                            {isHost && p.userId !== user.id && p.micOn && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRequestMute(p.socketId)}
                                className="h-6 text-[10px] px-2 bg-slate-800 border-slate-700 hover:bg-red-900/50 hover:text-red-300 text-slate-300 rounded cursor-pointer"
                              >
                                Mute
                              </Button>
                            )}

                            {/* Audio/Video Indicators */}
                            <div className="flex items-center space-x-1.5 text-slate-400">
                              {p.micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5 text-red-500" />}
                              {p.cameraOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5 text-red-500" />}
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
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-lg group">
      {isCameraEnabled ? (
        <VideoTrack trackRef={track as any} className="w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black flex flex-col items-center justify-center p-4">
          <div className="relative">
            {/* Pulsing speak ring */}
            <div className={`absolute -inset-4 rounded-full bg-blue-500/10 blur-md transition-opacity duration-300 ${isSpeaking ? 'opacity-100 animate-ping' : 'opacity-0'}`} />
            
            <div className={`h-20 w-20 rounded-full flex items-center justify-center bg-gradient-to-tr from-slate-800 to-slate-900 border-2 transition-all duration-300 ${isSpeaking ? 'border-blue-500 shadow-lg shadow-blue-500/20 scale-105' : 'border-slate-850'}`}>
              <span className="text-white font-extrabold text-2xl tracking-wide">{initials}</span>
            </div>
            
            {/* Mini mic state icon */}
            <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center shadow border ${track.participant.isMicrophoneEnabled ? 'bg-slate-900 border-slate-800 text-blue-500' : 'bg-red-600 border-red-500 text-white'}`}>
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
          <div className="inline-block bg-black/80 backdrop-blur border border-slate-800 text-slate-100 text-xs py-2 px-4 rounded-xl shadow-2xl animate-fade-in font-medium leading-relaxed max-w-full">
            {captions}
          </div>
        </div>
      )}

      {/* Participant name tag */}
      <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-semibold text-white">
        {name} {isLocal ? '(You)' : ''}
      </span>
    </div>
  );
}
