import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

export const POST = withAuth(async (req, { params, user }) => {
  try {
    const { meetingId } = params;
    const userId = user.userId;

    // Find meeting by ID or Code
    const meeting = await prisma.meeting.findFirst({
      where: {
        OR: [
          { id: meetingId },
          { code: meetingId }
        ]
      }
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Server-side guard: Only the host can start recording
    if (meeting.hostId !== userId) {
      return NextResponse.json({ error: 'Only the host can start recording' }, { status: 403 });
    }

    if (meeting.status !== 'ONGOING') {
      return NextResponse.json({ error: 'Meeting is not ongoing' }, { status: 400 });
    }

    // Check if there is already an active recording
    const existingActive = await prisma.recording.findFirst({
      where: {
        meetingId: meeting.id,
        status: 'PROCESSING'
      }
    });

    if (existingActive) {
      return NextResponse.json({ 
        message: 'Recording already in progress',
        recording: existingActive
      });
    }

    // Create new Recording row in database
    const recording = await prisma.recording.create({
      data: {
        meetingId: meeting.id,
        storageUrl: `https://mock-storage.local/recording-${meeting.code}.mp3`,
        status: 'PROCESSING'
      }
    });

    console.log(`Recording started for meeting ${meeting.code}. Created Recording row: ${recording.id}`);

    return NextResponse.json({
      message: 'Recording started successfully',
      recording
    });

  } catch (err: any) {
    console.error('Error starting recording:', err);
    return NextResponse.json({ error: 'Failed to start recording' }, { status: 500 });
  }
});
