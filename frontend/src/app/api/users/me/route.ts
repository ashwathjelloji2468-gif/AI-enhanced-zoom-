import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

export const GET = withAuth(async (req, { user }) => {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: dbUser });
  } catch (error) {
    console.error('Fetch profile error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred retrieving user profile' },
      { status: 500 }
    );
  }
});
