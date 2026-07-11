export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface AuthSession {
  user: UserProfile;
  accessToken: string;
}
