import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { 
  verifyAccessToken, 
  verifyRefreshToken, 
  signAccessToken, 
  hashToken, 
  cookieOptions, 
  TokenPayload 
} from '@/lib/auth';

export type AuthenticatedHandler = (
  req: NextRequest,
  context: { params: any; user: TokenPayload }
) => Promise<NextResponse> | NextResponse;

/**
 * API route wrapper to enforce JWT authentication.
 * Checks for token in HTTP-only cookies first, falling back to the Authorization header.
 * Automatically performs silent refresh using the refresh token cookie if the access token is expired.
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, segmentData: any) => {
    let token: string | undefined;

    // 1. Try to get token from cookies
    const cookieToken = req.cookies.get('access_token');
    if (cookieToken) {
      token = cookieToken.value;
    }

    // 2. Try to get token from Authorization header
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required. No token provided.' },
        { status: 401 }
      );
    }

    let payload = verifyAccessToken(token);

    // If access token is expired/invalid, try silent refresh
    if (!payload) {
      const refreshToken = req.cookies.get('refresh_token')?.value;
      if (refreshToken) {
        try {
          const refreshPayload = verifyRefreshToken(refreshToken);
          if (refreshPayload) {
            const hashedToken = hashToken(refreshToken);
            
            // Look up in database to verify it is still active and valid
            const dbToken = await prisma.refreshToken.findUnique({
              where: { token: hashedToken },
            });

            if (dbToken && !dbToken.revoked && dbToken.expiresAt > new Date()) {
              // Fetch user info to reconstruct payload
              const user = await prisma.user.findUnique({
                where: { id: refreshPayload.userId },
              });

              if (user) {
                payload = {
                  userId: user.id,
                  email: user.email,
                  name: user.name,
                };

                // Generate new access token
                const newAccessToken = signAccessToken(payload);

                // Call the route handler
                const response = await handler(req, { ...segmentData, user: payload });

                // Set new cookie on the response
                response.cookies.set('access_token', newAccessToken, cookieOptions);
                return response;
              }
            }
          }
        } catch (refreshErr) {
          console.error('Failed silent refresh in auth middleware:', refreshErr);
        }
      }

      return NextResponse.json(
        { error: 'Invalid or expired authentication token.' },
        { status: 401 }
      );
    }

    // Pass the user information to the handler
    return handler(req, { ...segmentData, user: payload });
  };
}
