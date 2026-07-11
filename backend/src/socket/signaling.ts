import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import {
  joinRoom,
  leaveAllRooms,
  updateParticipantMedia,
  ParticipantInfo,
  getRoomUsers,
  admitParticipant,
} from './rooms';

const prisma = new PrismaClient();

export function setupSignaling(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a meeting room
    socket.on(
      'join-room',
      async ({
        room,
        userId,
        name,
        avatarUrl,
        micOn = true,
        cameraOn = true,
      }: {
        room: string;
        userId: string;
        name: string;
        avatarUrl?: string | null;
        micOn?: boolean;
        cameraOn?: boolean;
      }) => {
        socket.join(room);
        console.log(`User ${name} (${userId}) joined room ${room} with socket ${socket.id}`);

        // 1. Fetch meeting configuration from Database
        let waitingRoomEnabled = false;
        let isHost = false;

        try {
          const dbMeeting = await prisma.meeting.findFirst({
            where: {
              OR: [
                { id: room },
                { code: room }
              ]
            }
          });

          if (dbMeeting) {
            waitingRoomEnabled = dbMeeting.waitingRoom;
            isHost = dbMeeting.hostId === userId;
          }
        } catch (error) {
          console.error('Error fetching meeting configurations for waiting room check:', error);
        }

        // Auto-admit if waiting room is disabled, or if the user is the host
        const isAdmitted = !waitingRoomEnabled || isHost;

        const newParticipant: ParticipantInfo = {
          socketId: socket.id,
          userId,
          name,
          avatarUrl,
          micOn,
          cameraOn,
          isAdmitted,
        };

        // Add to room tracker
        const participants = joinRoom(room, newParticipant);

        if (!isAdmitted) {
          console.log(`User ${name} (${userId}) put in waiting room for room ${room}`);
          
          // Let client know they are in the waiting room
          socket.emit('waiting-room-status', { waiting: true });

          // Send list of already waiting participants to the host(s)
          // Broadcast user-waiting to the room (hosts will handle/display it)
          io.to(room).emit('user-waiting', newParticipant);
        } else {
          // Let client know they are admitted
          socket.emit('waiting-room-status', { waiting: false });

          // Tell the joining client about all other admitted participants in the room
          socket.emit('room-users', participants.filter((p) => p.isAdmitted && p.socketId !== socket.id));

          // Notify other participants in the room that a new user joined
          socket.to(room).emit('user-joined', newParticipant);

          // If the host joins, let them see who is currently in the waiting room
          if (isHost) {
            const waitingUsers = participants.filter((p) => !p.isAdmitted);
            waitingUsers.forEach((wp) => {
              socket.emit('user-waiting', wp);
            });
          }
        }
      }
    );

    // Host admits a participant from waiting room
    socket.on('admit-participant', ({ room, targetSocketId }: { room: string; targetSocketId: string }) => {
      console.log(`Host ${socket.id} admitting participant ${targetSocketId} in room ${room}`);
      const admittedUser = admitParticipant(room, targetSocketId);

      if (admittedUser) {
        // Notify the admitted client
        io.to(targetSocketId).emit('waiting-room-status', { waiting: false });

        // Fetch current admitted users
        const admittedParticipants = getRoomUsers(room, true);

        // Send current admitted list to the newly admitted user
        io.to(targetSocketId).emit('room-users', admittedParticipants.filter((p) => p.socketId !== targetSocketId));

        // Notify room that user joined
        io.to(room).emit('user-joined', admittedUser);
      }
    });

    // Toggle Mic or Camera state
    socket.on(
      'toggle-media',
      ({
        room,
        mediaType,
        enabled,
      }: {
        room: string;
        mediaType: 'mic' | 'camera';
        enabled: boolean;
      }) => {
        console.log(`User ${socket.id} toggled ${mediaType} to ${enabled} in room ${room}`);
        const updatedParticipants = updateParticipantMedia(room, socket.id, mediaType, enabled);
        
        // Broadcast media state changes to all other users in the room
        socket.to(room).emit('media-state-changed', {
          socketId: socket.id,
          mediaType,
          enabled,
        });
      }
    );

    // Host requests to mute a participant
    socket.on('request-mute', ({ room, targetSocketId }: { room: string; targetSocketId: string }) => {
      console.log(`Host requested mute for participant ${targetSocketId} in room ${room}`);
      io.to(targetSocketId).emit('mute-request');
    });

    // Handle in-meeting chat messages
    socket.on(
      'chat:message',
      ({ room, userId, userName, content }: { room: string; userId: string; userName: string; content: string }) => {
        const messagePayload = {
          id: crypto.randomUUID(),
          senderId: userId,
          senderName: userName,
          content,
          createdAt: new Date().toISOString(),
        };
        console.log(`New chat message in room ${room} from ${userName}: "${content}"`);
        io.to(room).emit('chat:message', messagePayload);
      }
    );

    // Handle in-meeting emoji reactions (broadcast to all)
    socket.on(
      'chat:reaction',
      ({ room, userId, userName, reaction }: { room: string; userId: string; userName: string; reaction: string }) => {
        const reactionPayload = {
          id: crypto.randomUUID(),
          senderId: userId,
          senderName: userName,
          reaction,
          createdAt: new Date().toISOString(),
        };
        console.log(`Reaction in room ${room} from ${userName}: ${reaction}`);
        io.to(room).emit('chat:reaction', reactionPayload);
      }
    );

    // End meeting for all (host only)
    socket.on('end-meeting', async ({ room }: { room: string }) => {
      console.log(`Host requested to end meeting ${room} for all`);
      try {
        const dbMeeting = await prisma.meeting.findFirst({
          where: { OR: [{ id: room }, { code: room }] }
        });
        if (dbMeeting) {
          await prisma.meeting.update({
            where: { id: dbMeeting.id },
            data: {
              status: 'ENDED',
              endedAt: new Date(),
            },
          });
        }
      } catch (err) {
        console.error('Failed to end meeting in database:', err);
      }

      io.to(room).emit('meeting-ended');
    });

    // Handle explicit disconnect or leaving room
    socket.on('leave-room', async ({ room }: { room: string }) => {
      socket.leave(room);
      const { leftUser, remainingUsers } = leaveAllRooms(socket.id);
      if (leftUser) {
        console.log(`User ${leftUser.name} left room ${room}`);
        socket.to(room).emit('user-left', { socketId: socket.id, userId: leftUser.userId });
        
        // Auto-transfer host if the leaving user was the host
        await checkAndTransferHost(room, leftUser.userId, remainingUsers);
      }
    });

    // Handle connection drops/closes
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const { room, leftUser, remainingUsers } = leaveAllRooms(socket.id);
      if (room && leftUser) {
        console.log(`User ${leftUser.name} disconnected from room ${room}`);
        socket.to(room).emit('user-left', { socketId: socket.id, userId: leftUser.userId });

        // Auto-transfer host if the leaving user was the host
        await checkAndTransferHost(room, leftUser.userId, remainingUsers);
      }
    });
  });

  // Helper to transfer host role when host leaves
  async function checkAndTransferHost(room: string, leftUserId: string, remainingUsers: any[]) {
    try {
      const dbMeeting = await prisma.meeting.findFirst({
        where: { OR: [{ id: room }, { code: room }] }
      });

      if (dbMeeting && dbMeeting.hostId === leftUserId && dbMeeting.status !== 'ENDED') {
        const nextHost = remainingUsers.find((p) => p.isAdmitted);
        if (nextHost) {
          console.log(`Auto-assigning host role to ${nextHost.name} in room ${room}`);
          
          await prisma.$transaction([
            prisma.meeting.update({
              where: { id: dbMeeting.id },
              data: { hostId: nextHost.userId },
            }),
            prisma.participant.update({
              where: {
                meetingId_userId: {
                  meetingId: dbMeeting.id,
                  userId: nextHost.userId,
                },
              },
              data: { role: 'HOST' },
            })
          ]);

          io.to(room).emit('host-changed', {
            newHostSocketId: nextHost.socketId,
            newHostUserId: nextHost.userId,
            newHostName: nextHost.name,
          });
        }
      }
    } catch (err) {
      console.error('Failed to auto-transfer host role:', err);
    }
  }
}
