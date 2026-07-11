import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development-change-this-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-jwt-refresh-key-for-development';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export interface RefreshTokenPayload {
  userId: string;
}

/**
 * Signs a stateless access token.
 */
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
  });
}

/**
 * Signs a refresh token.
 */
export function signRefreshToken(payload: RefreshTokenPayload): string {
  // Generate a random string or UUID, then sign it
  const jti = crypto.randomUUID();
  return jwt.sign({ ...payload, jti }, JWT_REFRESH_SECRET, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
  });
}

/**
 * Verifies an access token.
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Verifies a refresh token.
 */
export function verifyRefreshToken(token: string): (RefreshTokenPayload & { jti: string }) | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload & { jti: string };
  } catch (error) {
    return null;
  }
}

/**
 * Hashes a token string for safe storage in the database.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Configuration for secure cookies.
 */
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
