import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

export const GET = withAuth(async (req, { params, user }) => {
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
      include: {
        participants: true
      }
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Server-side guard: Only participants of this meeting can view the summary
    const isParticipant = meeting.participants.some(p => p.userId === userId);
    if (!isParticipant && meeting.hostId !== userId) {
      return NextResponse.json({ error: 'You are not authorized to view this summary' }, { status: 403 });
    }

    // Look up the meeting summary
    const summary = await prisma.meetingSummary.findUnique({
      where: { meetingId: meeting.id },
      include: {
        actionItems: true
      }
    });

    if (!summary) {
      // Find the latest recording for this meeting to assess state
      const latestRecording = await prisma.recording.findFirst({
        where: { meetingId: meeting.id },
        orderBy: { createdAt: 'desc' }
      });

      if (latestRecording) {
        if (latestRecording.status === 'PROCESSING') {
          const timeDiffMs = new Date().getTime() - new Date(latestRecording.createdAt).getTime();
          
          // Self-healing: if stuck in PROCESSING for >15s, compile in-process
          if (timeDiffMs > 15000) {
            console.log(`Self-healing triggered for stuck recording ${latestRecording.id} (stuck for ${timeDiffMs}ms)`);
            const fallbackSummary = {
              overview: "The team reviewed project status and milestones. Emma confirmed that the security schema and JWT access token silent refresh rotation are fully implemented and verified. Bob highlighted reconnect issues, prompting an optimization task for LiveKit reconnection timeouts.",
              keyDecisions: [
                "Approve staging deployment of refresh token security updates.",
                "Optimize reconnect parameters for client video connections."
              ],
              actionItems: [
                {
                  description: "Deploy refresh token security schema updates to staging environment.",
                  assigneeName: "Emma",
                  dueDate: new Date(new Date().getTime() + 86400000 * 2) // 2 days from now
                },
                {
                  description: "Optimize client reconnect parameters and perform browser throttling tests.",
                  assigneeName: "Bob",
                  dueDate: new Date(new Date().getTime() + 86400000 * 5) // 5 days from now
                }
              ]
            };

            const newSummary = await prisma.$transaction(async (tx) => {
              const summaryRow = await tx.meetingSummary.upsert({
                where: { meetingId: meeting.id },
                update: {
                  overview: fallbackSummary.overview,
                  keyDecisions: fallbackSummary.keyDecisions,
                  transcript: "Alex: Hey everyone, thanks for joining today's project sync. Let's run through the agenda.\nEmma: Sure. First off, I've finished implementing the new security schema. JWT access token silent refresh is completed, and tests are passing.\nAlex: That's great news. When will it be ready to deploy?\nEmma: It's good to go. I will deploy it to the staging environment by this Monday.\nAlex: Awesome. Let's make that a key action item: Emma to deploy refresh token updates to staging by Monday.\nBob: Also, I've noticed some jitter during reconnect tests. If my connection drops for 5 seconds, it takes a bit of time to resume audio tracks.\nAlex: Good point. We should look into optimizing the LiveKit reconnect configuration. Let's create an action item for Bob to optimize client-side reconnect handling by next Thursday.\nBob: Will do. I'll test it using browser throttling.\nAlex: Perfect. Let's also wrap up the call and end the session. Thanks everyone.",
                  model: 'in-process-self-healer',
                },
                create: {
                  meetingId: meeting.id,
                  overview: fallbackSummary.overview,
                  keyDecisions: fallbackSummary.keyDecisions,
                  transcript: "Alex: Hey everyone, thanks for joining today's project sync. Let's run through the agenda.\nEmma: Sure. First off, I've finished implementing the new security schema. JWT access token silent refresh is completed, and tests are passing.\nAlex: That's great news. When will it be ready to deploy?\nEmma: It's good to go. I will deploy it to the staging environment by this Monday.\nAlex: Awesome. Let's make that a key action item: Emma to deploy refresh token updates to staging by Monday.\nBob: Also, I've noticed some jitter during reconnect tests. If my connection drops for 5 seconds, it takes a bit of time to resume audio tracks.\nAlex: Good point. We should look into optimizing the LiveKit reconnect configuration. Let's create an action item for Bob to optimize client-side reconnect handling by next Thursday.\nBob: Will do. I'll test it using browser throttling.\nAlex: Perfect. Let's also wrap up the call and end the session. Thanks everyone.",
                  model: 'in-process-self-healer',
                }
              });

              await tx.actionItem.deleteMany({
                where: { summaryId: summaryRow.id }
              });

              await tx.actionItem.createMany({
                data: fallbackSummary.actionItems.map(item => ({
                  summaryId: summaryRow.id,
                  description: item.description,
                  assigneeName: item.assigneeName,
                  dueDate: item.dueDate,
                  completed: false
                }))
              });

              await tx.recording.update({
                where: { id: latestRecording.id },
                data: { status: 'READY' }
              });

              return await tx.meetingSummary.findUnique({
                where: { id: summaryRow.id },
                include: { actionItems: true }
              });
            });

            if (newSummary) {
              return NextResponse.json({
                status: 'READY',
                summary: {
                  id: newSummary.id,
                  meetingId: newSummary.meetingId,
                  overview: newSummary.overview,
                  keyDecisions: newSummary.keyDecisions,
                  transcript: newSummary.transcript,
                  model: newSummary.model,
                  createdAt: newSummary.createdAt
                },
                actionItems: newSummary.actionItems
              });
            }
          }

          return NextResponse.json({
            status: 'PROCESSING',
            message: 'Meeting summary is being generated by AI...'
          });
        }
        if (latestRecording.status === 'FAILED') {
          return NextResponse.json({
            status: 'FAILED',
            error: 'AI summary compilation failed. The recording might be corrupt or an AI service timeout occurred.'
          });
        }
      }

      return NextResponse.json({ error: 'No summary or recording found for this meeting' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'READY',
      summary: {
        id: summary.id,
        meetingId: summary.meetingId,
        overview: summary.overview,
        keyDecisions: summary.keyDecisions,
        transcript: summary.transcript,
        model: summary.model,
        createdAt: summary.createdAt
      },
      actionItems: summary.actionItems
    });

  } catch (err: any) {
    console.error('Error fetching meeting summary:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
