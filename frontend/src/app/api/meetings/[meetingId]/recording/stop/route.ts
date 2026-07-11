import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';
import { enqueueSummaryJob } from '@/lib/queue';

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

    // Only host can stop recording
    if (meeting.hostId !== userId) {
      return NextResponse.json({ error: 'Only the host can stop recording' }, { status: 403 });
    }

    // Find the active processing or failed recording
    const activeRecording = await prisma.recording.findFirst({
      where: {
        meetingId: meeting.id,
        status: { in: ['PROCESSING', 'FAILED'] }
      }
    });

    if (!activeRecording) {
      return NextResponse.json({ error: 'No active or failed recording found for this meeting' }, { status: 404 });
    }

    // Calculate duration since start
    const durationMs = Date.now() - new Date(activeRecording.createdAt).getTime();
    const durationSec = Math.max(1, Math.round(durationMs / 1000));

    // Update Recording entry and reset status to PROCESSING for the worker
    const recording = await prisma.recording.update({
      where: { id: activeRecording.id },
      data: { 
        durationSec,
        status: 'PROCESSING'
      }
    });

    console.log(`Recording stopped for meeting ${meeting.code}. Active duration: ${durationSec}s. Enqueuing summary job...`);

    // Enqueue summary job immediately for background AI compilation
    await enqueueSummaryJob(recording.id);

    return NextResponse.json({
      message: 'Recording stopped successfully. AI summary processing has started.',
      recording
    });

  } catch (err: any) {
    console.error('Error stopping recording:', err);
    return NextResponse.json({ error: 'Failed to stop recording' }, { status: 500 });
  }
});
