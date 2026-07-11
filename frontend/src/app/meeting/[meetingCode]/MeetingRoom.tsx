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
  Brain
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
        <div className="flex-1 flex items-center justify-center p-6 pt-20 pb-28">
          {tracks.length === 0 ? (
            <div className="text-slate-500 text-sm">Waiting for other participants...</div>
          ) : layoutMode === 'gallery' ? (
            
            // GALLERY VIEW
            <div className={`grid gap-4 w-full h-full max-w-5xl items-center justify-center ${
              tracks.length === 1 ? 'grid-cols-1 max-w-2xl' :
              tracks.length === 2 ? 'grid-cols-2' :
              tracks.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'
            }`}>
              {tracks.map((track) => (
                <div key={track.participant.identity} className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video shadow-lg border border-slate-800">
                  <VideoTrack trackRef={track as any} className="w-full h-full object-cover" />
                  <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-semibold text-white">
                    {track.participant.name || track.participant.identity} {track.participant.isLocal ? '(You)' : ''}
                  </span>
                </div>
              ))}
            </div>

          ) : (

            // SPEAKER VIEW
            <div className="flex flex-col md:flex-row gap-4 w-full h-full max-w-6xl">
              {activeSpeakerTrack && (
                <div className="flex-1 rounded-2xl overflow-hidden bg-slate-900 relative shadow-xl border border-slate-800">
                  <VideoTrack trackRef={activeSpeakerTrack as any} className="w-full h-full object-cover" />
                  <span className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center">
                    <Award className="h-4 w-4 text-yellow-500 mr-2" />
                    {activeSpeakerTrack.participant.name || activeSpeakerTrack.participant.identity} {activeSpeakerTrack.participant.isLocal ? '(You)' : ''}
                  </span>
                </div>
              )}

              {tracks.length > 1 && (
                <ScrollArea className="md:w-60 flex flex-col gap-2 max-h-full">
                  <div className="space-y-3 pr-2">
                    {tracks
                      .filter((t) => t.participant.identity !== activeSpeakerTrack?.participant.identity)
                      .map((track) => (
                        <div key={track.participant.identity} className="rounded-xl overflow-hidden bg-slate-900 aspect-video relative border border-slate-800 shadow">
                          <VideoTrack trackRef={track as any} className="w-full h-full object-cover" />
                          <span className="absolute bottom-2 left-2 bg-black/75 px-2 py-1 rounded-lg text-[10px] font-semibold text-white">
                            {track.participant.name || track.participant.identity}
                          </span>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR */}
        <footer className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black to-transparent flex items-center justify-between px-8 z-10">
          
          {/* Audio/Video toggles with direct TooltipTrigger button styling */}
          <div className="flex items-center space-x-3">
            <Tooltip>
              <TooltipTrigger 
                onClick={() => localParticipant && handleToggleMic(localParticipant)}
                className={`h-12 w-12 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-all ${
                  localMicOn 
                    ? 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800' 
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
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
                className={`h-12 w-12 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-all ${
                  localCamOn 
                    ? 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800' 
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {localCamOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-slate-200 border-slate-800">
                {localCamOn ? 'Stop Camera' : 'Start Camera'}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Center bar actions */}
          <div className="flex items-center space-x-3 bg-slate-900/60 backdrop-blur-md px-6 py-2 rounded-2xl border border-slate-850">
            {/* Participants */}
            <Tooltip>
              <TooltipTrigger 
                onClick={() => {
                  setIsParticipantsOpen(!isParticipantsOpen);
                  setIsChatOpen(false);
                  setIsAskAIOpen(false);
                }}
                className={`text-slate-400 hover:text-white flex flex-col items-center justify-center p-2 rounded-lg transition-colors cursor-pointer ${
                  isParticipantsOpen ? 'text-blue-500 hover:text-blue-400' : ''
                }`}
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
                className={`text-slate-400 hover:text-white flex flex-col items-center justify-center p-2 rounded-lg transition-colors cursor-pointer ${
                  isChatOpen ? 'text-blue-500 hover:text-blue-400' : ''
                }`}
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-[10px] mt-1 hidden sm:block">Chat</span>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-slate-200 border-slate-800">Toggle Chat Panel</TooltipContent>
            </Tooltip>

            {/* Ask AI */}
            <Tooltip>
              <TooltipTrigger 
                onClick={() => {
                  setIsAskAIOpen(!isAskAIOpen);
                  setIsChatOpen(false);
                  setIsParticipantsOpen(false);
                }}
                className={`text-slate-400 hover:text-white flex flex-col items-center justify-center p-2 rounded-lg transition-colors cursor-pointer ${
                  isAskAIOpen ? 'text-indigo-400 hover:text-indigo-300' : ''
                }`}
              >
                <Brain className="h-5 w-5 text-indigo-400 animate-pulse" />
                <span className="text-[10px] mt-1 hidden sm:block font-bold">Ask AI</span>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-slate-200 border-slate-800">Ask questions about this meeting</TooltipContent>
            </Tooltip>

            {/* Share Screen */}
            <Tooltip>
              <TooltipTrigger 
                onClick={() => {
                  if (localParticipant) {
                    const isSharing = localParticipant.isScreenShareEnabled;
                    localParticipant.setScreenShareEnabled(!isSharing);
                  }
                }}
                className="text-slate-400 hover:text-white flex flex-col items-center justify-center p-2 rounded-lg transition-colors cursor-pointer"
              >
                <Monitor className="h-5 w-5 text-green-500" />
                <span className="text-[10px] mt-1 hidden sm:block">Share Screen</span>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-slate-200 border-slate-800">Start / Stop Screen Share</TooltipContent>
            </Tooltip>

            {/* Cloud Recording Control */}
            {isHost && (
              <Tooltip>
                <TooltipTrigger 
                  onClick={handleToggleRecording}
                  disabled={isProcessingRecording}
                  className={`text-slate-400 hover:text-white flex flex-col items-center justify-center p-2 rounded-lg transition-colors cursor-pointer ${
                    isRecording ? 'text-red-500 hover:text-red-400' : ''
                  } ${isProcessingRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Square className={`h-5 w-5 ${isRecording ? 'fill-red-500' : ''} ${isProcessingRecording ? 'animate-pulse' : ''}`} />
                  <span className="text-[10px] mt-1 hidden sm:block">
                    {isProcessingRecording ? 'Processing...' : isRecording ? 'Recording' : 'Record'}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-slate-200 border-slate-800">
                  {isProcessingRecording ? 'Processing request...' : isRecording ? 'Stop Recording' : 'Start Recording'}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Reactions Menubar */}
            <DropdownMenu>
              <DropdownMenuTrigger className="text-slate-400 hover:text-white flex flex-col items-center justify-center p-2 rounded-lg transition-colors cursor-pointer">
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

          </div>

          {/* Leave Button */}
          <Button 
            onClick={handleLeaveTrigger}
            className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 h-12 rounded-xl flex items-center shadow-lg shadow-red-600/25 active:scale-[0.98] transition-all"
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            Leave
          </Button>

        </footer>
      </div>

      {/* Sidebar Slideovers */}
      {(isChatOpen || isParticipantsOpen || isAskAIOpen) && (
        <aside className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col h-full z-10">
          
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
