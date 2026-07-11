import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashToken, cookieOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refresh_token')?.value;

    if (refreshToken) {
      const hashedToken = hashToken(refreshToken);
      
      // Revoke the refresh token in the database
      try {
        await prisma.refreshToken.delete({
          where: { token: hashedToken },
        });
      } catch (error) {
        // Token might not exist or already be deleted, ignore error
      }
    }

    const response = NextResponse.json({ message: 'Logout successful' });

    // Clear authentication cookies by setting expired dates
    response.cookies.set('access_token', '', { ...cookieOptions, maxAge: 0 });
    response.cookies.set('refresh_token', '', { ...cookieOptions, maxAge: 0 });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during logout' },
      { status: 500 }
    );
  }
}
