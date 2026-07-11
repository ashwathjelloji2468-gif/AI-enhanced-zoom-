import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { enqueueSummaryJob } from '@/lib/queue';
import { WebhookReceiver } from 'livekit-server-sdk';

const apiKey = process.env.LIVEKIT_API_KEY || '';
const apiSecret = process.env.LIVEKIT_API_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const authHeader = req.headers.get('Authorization') || '';
    
    let eventPayload: any;

    // 1. Enforce strict webhook signature verification in production if credentials exist
    if (apiKey && apiSecret) {
      if (!authHeader) {
        console.error('Missing Authorization header for webhook signature verification');
        return NextResponse.json({ error: 'Missing webhook Authorization signature' }, { status: 401 });
      }
      try {
        const receiver = new WebhookReceiver(apiKey, apiSecret);
        eventPayload = await receiver.receive(rawBody, authHeader);
        console.log(`LiveKit webhook signature verified for event: ${eventPayload.event}`);
      } catch (err: any) {
        console.error('LiveKit webhook signature verification failed:', err.message);
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    } else {
      // In local development fallback mode, parse payload directly
      try {
        eventPayload = JSON.parse(rawBody);
        console.log(`Parsed webhook payload directly (unverified/dev mode) for event: ${eventPayload?.event}`);
      } catch (parseErr) {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
      }
    }

    const eventName = eventPayload?.event;
    console.log(`Processing webhook event: ${eventName}`, eventPayload);

    let meetingCode: string | undefined;

    if (eventName === 'room_finished' && eventPayload?.room?.name) {
      meetingCode = eventPayload.room.name;
    } else if (eventName === 'egress_finished' && eventPayload?.egressInfo?.roomName) {
      meetingCode = eventPayload.egressInfo.roomName;
    } else if (eventPayload?.roomName) {
      meetingCode = eventPayload.roomName;
    } else if (eventPayload?.recordingId) {
      // Direct mock trigger via recordingId
      const recording = await prisma.recording.findUnique({
        where: { id: eventPayload.recordingId }
      });
      if (recording) {
        // Idempotency: Skip if already processed or failed
        if (recording.status !== 'PROCESSING') {
          return NextResponse.json({ message: 'Recording is already processed or failed', status: recording.status });
        }
        await enqueueSummaryJob(recording.id);
        return NextResponse.json({ message: 'Mock job enqueued successfully', recordingId: recording.id });
      }
      return NextResponse.json({ error: 'Recording ID not found' }, { status: 404 });
    }

    if (!meetingCode) {
      return NextResponse.json({ message: 'Ignored: No meeting code or room name resolved from event' });
    }

    // Look up the meeting
    const meeting = await prisma.meeting.findFirst({
      where: {
        OR: [
          { id: meetingCode },
          { code: meetingCode }
        ]
      }
    });

    if (!meeting) {
      return NextResponse.json({ error: `Meeting not found for room name: ${meetingCode}` }, { status: 404 });
    }

    // Find the latest processing recording for this meeting
    const recording = await prisma.recording.findFirst({
      where: {
        meetingId: meeting.id,
        status: 'PROCESSING'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!recording) {
      return NextResponse.json({ message: `No active processing recording found for meeting ${meeting.code}. Webhook ignored.` });
    }

    // Enqueue summary job (deduplicated by BullMQ using rec-[recordingId] jobId)
    await enqueueSummaryJob(recording.id);

    return NextResponse.json({
      message: 'Job successfully enqueued from webhook',
      recordingId: recording.id,
      meetingCode: meeting.code
    });

  } catch (err: any) {
    console.error('Error handling LiveKit webhook:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
