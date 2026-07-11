import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

/**
 * GET: Retrieve details of a meeting by ID or Code.
 */
export const GET = withAuth(async (req, { params, user }) => {
  try {
    const { meetingId } = params;

    // Search by UUID id or code
    const meeting = await prisma.meeting.findFirst({
      where: {
        OR: [
          { id: meetingId },
          { code: meetingId }
        ]
      },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ meeting });
  } catch (error) {
    console.error('Fetch meeting details error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred retrieving meeting details' },
      { status: 500 }
    );
  }
});
