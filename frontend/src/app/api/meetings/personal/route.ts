import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

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
 * POST: Retrieve or lazily create a Personal Room for the authenticated user.
 */
export const POST = withAuth(async (req, { user }) => {
  try {
    const userId = user.userId;

    // Check if the user already has a Personal Room meeting
    let personalMeeting = await prisma.meeting.findFirst({
      where: {
        hostId: userId,
        title: 'Personal Room',
      },
    });

    if (!personalMeeting) {
      // Generate a unique meeting code
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

      // Create Personal Room meeting and register the host as the first participant
      personalMeeting = await prisma.$transaction(async (tx) => {
        const newMeeting = await tx.meeting.create({
          data: {
            code,
            title: 'Personal Room',
            hostId: userId,
            waitingRoom: false,
            status: 'SCHEDULED',
          },
        });

        await tx.participant.create({
          data: {
            meetingId: newMeeting.id,
            userId,
            role: 'HOST',
            micOn: true,
            cameraOn: true,
          },
        });

        return newMeeting;
      });
    }

    return NextResponse.json({ code: personalMeeting.code });
  } catch (error) {
    console.error('Personal Room fetch/create error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred resolving Personal Room' },
      { status: 500 }
    );
  }
});
