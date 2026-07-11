import { AccessToken } from 'livekit-server-sdk';

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

/**
 * Generates an Access Token for LiveKit connection.
 * @param roomName The meeting code or room name.
 * @param participantName The user's name.
 * @param identity The user's unique identity (usually userId).
 * @returns The JWT string for LiveKit connection.
 */
export async function generateLiveKitToken(
  roomName: string,
  participantName: string,
  identity: string
): Promise<string> {
  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit credentials are not configured in environment variables.');
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name: participantName,
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  return await token.toJwt();
}
