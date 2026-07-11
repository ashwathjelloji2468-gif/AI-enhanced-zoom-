import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';
import { generateLiveKitToken } from '@/lib/livekit';

export const POST = withAuth(async (req, { params, user }) => {
  try {
    const { meetingId } = params;
    const userId = user.userId;

    // Find the meeting by ID or Code
    const meeting = await prisma.meeting.findFirst({
      where: {
        OR: [
          { id: meetingId },
          { code: meetingId }
        ]
      },
    });

    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    if (meeting.status === 'ENDED' || meeting.status === 'CANCELLED') {
      return NextResponse.json(
        { error: `This meeting has already ${meeting.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    if (meeting.isLocked && meeting.hostId !== userId) {
      return NextResponse.json(
        { error: 'This meeting is locked by the host and cannot be joined' },
        { status: 403 }
      );
    }

    // Determine participant role
    const isHost = meeting.hostId === userId;
    const role = isHost ? 'HOST' : 'PARTICIPANT';

    // If host is joining a scheduled meeting, set it to ONGOING
    if (isHost && meeting.status === 'SCHEDULED') {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          status: 'ONGOING',
          startedAt: new Date(),
        },
      });
    }

    // Upsert participant record
    const participant = await prisma.participant.upsert({
      where: {
        meetingId_userId: {
          meetingId: meeting.id,
          userId,
        },
      },
      update: {
        leftAt: null, // Reset if they previously left
        joinedAt: new Date(),
      },
      create: {
        meetingId: meeting.id,
        userId,
        role,
        micOn: true,
        cameraOn: true,
      },
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
    });

    // Generate LiveKit WebRTC Access Token if configured
    let liveKitToken: string | null = null;
    try {
      liveKitToken = await generateLiveKitToken(meeting.code, user.name, userId);
    } catch (tokenError: any) {
      console.warn('LiveKit token generation skipped/failed:', tokenError.message);
      // We don't crash, we just return null for the token so development can proceed
    }

    return NextResponse.json({
      message: 'Joined meeting successfully',
      meeting: {
        id: meeting.id,
        code: meeting.code,
        title: meeting.title,
        status: meeting.status,
      },
      participant,
      liveKitToken,
    });
  } catch (error) {
    console.error('Join meeting error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred joining meeting' },
      { status: 500 }
    );
  }
});
