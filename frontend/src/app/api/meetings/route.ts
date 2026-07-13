import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';
import { createMeetingSchema } from '@/lib/validators/meeting.schema';

// Helper to generate a code in the format "abc-defg-hij"
function generateMeetingCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const randStr = (len: number) => {
    let result = '';
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  return `${randStr(3)}-${randStr(4)}-${randStr(3)}`;
}

/**
 * GET: Retrieve list of meetings for the authenticated user (hosted or participated).
 */
export const GET = withAuth(async (req, { user }) => {
  try {
    const userId = user.userId;

    const meetings = await prisma.meeting.findMany({
      where: {
        OR: [
          { hostId: userId },
          {
            participants: {
              some: { userId },
            },
          },
        ],
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
          select: {
            id: true,
            userId: true,
            role: true,
            joinedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ meetings });
  } catch (error) {
    console.error('Fetch meetings error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred retrieving meetings' },
      { status: 500 }
    );
  }
});

/**
 * POST: Create a new meeting and register the host as the first participant.
 */
export const POST = withAuth(async (req, { user }) => {
  try {
    const body = await req.json();
    const result = createMeetingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, scheduledAt, waitingRoom, isLocked } = result.data;
    const userId = user.userId;

    // Generate unique code
    let code = generateMeetingCode();
    let codeExists = true;
    let attempts = 0;
    while (codeExists && attempts < 10) {
      const match = await prisma.meeting.findUnique({ where: { code } });
      if (!match) {
        codeExists = false;
      } else {
        code = generateMeetingCode();
        attempts++;
      }
    }

    if (codeExists) {
      return NextResponse.json(
        { error: 'Could not generate a unique meeting code. Please try again.' },
        { status: 500 }
      );
    }

    // Create meeting and add host as first participant
    const newMeeting = await prisma.meeting.create({
      data: {
        code,
        title,
        hostId: userId,
        waitingRoom,
        isLocked,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: 'SCHEDULED',
      },
    });

    await prisma.participant.create({
      data: {
        meetingId: newMeeting.id,
        userId,
        role: 'HOST',
        micOn: true,
        cameraOn: true,
      },
    });

    const meeting = newMeeting;

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error) {
    console.error('Create meeting error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred creating meeting' },
      { status: 500 }
    );
  }
});
