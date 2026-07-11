import { UserProfile } from './auth';

export type MeetingStatus = 'SCHEDULED' | 'ONGOING' | 'ENDED' | 'CANCELLED';
export type ParticipantRole = 'HOST' | 'CO_HOST' | 'PARTICIPANT';

export interface MeetingDetails {
  id: string;
  code: string;
  title: string;
  hostId: string;
  host: UserProfile;
  status: MeetingStatus;
  scheduledAt?: Date | string | null;
  startedAt?: Date | string | null;
  endedAt?: Date | string | null;
  isLocked: boolean;
  waitingRoom: boolean;
  participants: ParticipantDetails[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ParticipantDetails {
  id: string;
  meetingId: string;
  userId: string;
  user: UserProfile;
  role: ParticipantRole;
  joinedAt: Date | string;
  leftAt?: Date | string | null;
  micOn: boolean;
  cameraOn: boolean;
}
