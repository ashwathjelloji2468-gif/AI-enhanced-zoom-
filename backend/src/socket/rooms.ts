export interface ParticipantInfo {
  socketId: string;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  micOn: boolean;
  cameraOn: boolean;
  isAdmitted: boolean;
}

// Maps meetingCode -> Array of participants
const activeRooms: Record<string, ParticipantInfo[]> = {};

/**
 * Adds a participant to a room.
 */
export function joinRoom(room: string, participant: ParticipantInfo): ParticipantInfo[] {
  if (!activeRooms[room]) {
    activeRooms[room] = [];
  }

  // Prevent duplicates with same socketId or userId
  activeRooms[room] = activeRooms[room].filter(
    (p) => p.socketId !== participant.socketId && p.userId !== participant.userId
  );

  activeRooms[room].push(participant);
  return activeRooms[room];
}

/**
 * Admits a participant waiting in the lobby.
 */
export function admitParticipant(room: string, socketId: string): ParticipantInfo | null {
  const participants = activeRooms[room] || [];
  const participant = participants.find((p) => p.socketId === socketId);
  if (participant) {
    participant.isAdmitted = true;
    return participant;
  }
  return null;
}

/**
 * Removes a participant from a room by socketId.
 */
export function leaveRoom(
  room: string,
  socketId: string
): { leftUser: ParticipantInfo | null; remainingUsers: ParticipantInfo[] } {
  const participants = activeRooms[room] || [];
  const leftUser = participants.find((p) => p.socketId === socketId) || null;
  const remainingUsers = participants.filter((p) => p.socketId !== socketId);

  if (remainingUsers.length === 0) {
    delete activeRooms[room];
  } else {
    activeRooms[room] = remainingUsers;
  }

  return { leftUser, remainingUsers };
}

/**
 * Finds which room a socketId belongs to, and removes them from it.
 */
export function leaveAllRooms(socketId: string): {
  room: string | null;
  leftUser: ParticipantInfo | null;
  remainingUsers: ParticipantInfo[];
} {
  for (const room of Object.keys(activeRooms)) {
    const leftUser = activeRooms[room].find((p) => p.socketId === socketId);
    if (leftUser) {
      const { remainingUsers } = leaveRoom(room, socketId);
      return { room, leftUser, remainingUsers };
    }
  }

  return { room: null, leftUser: null, remainingUsers: [] };
}

/**
 * Gets participants in a room.
 */
export function getRoomUsers(room: string, onlyAdmitted = true): ParticipantInfo[] {
  const all = activeRooms[room] || [];
  return onlyAdmitted ? all.filter((p) => p.isAdmitted) : all;
}

/**
 * Updates mic or camera state of a participant in a room.
 */
export function updateParticipantMedia(
  room: string,
  socketId: string,
  mediaType: 'mic' | 'camera',
  enabled: boolean
): ParticipantInfo[] {
  const participants = activeRooms[room] || [];
  const participant = participants.find((p) => p.socketId === socketId);

  if (participant) {
    if (mediaType === 'mic') {
      participant.micOn = enabled;
    } else if (mediaType === 'camera') {
      participant.cameraOn = enabled;
    }
  }

  return participants;
}
