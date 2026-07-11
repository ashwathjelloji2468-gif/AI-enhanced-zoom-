import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';

export const PATCH = withAuth(async (req, { params, user }) => {
  try {
    const { id } = params;
    const userId = user.userId;

    const { completed } = await req.json();
    if (typeof completed !== 'boolean') {
      return NextResponse.json({ error: 'completed field must be a boolean' }, { status: 400 });
    }

    // Find the action item and verify authorization
    const actionItem = await prisma.actionItem.findUnique({
      where: { id },
      include: {
        summary: {
          include: {
            meeting: {
              include: {
                participants: true
              }
            }
          }
        }
      }
    });

    if (!actionItem) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }

    // Server-side guard: Only participants of the meeting can check off action items
    const meeting = actionItem.summary.meeting;
    const isParticipant = meeting.participants.some(p => p.userId === userId);
    
    if (!isParticipant && meeting.hostId !== userId) {
      return NextResponse.json({ error: 'You are not authorized to edit this action item' }, { status: 403 });
    }

    // Toggle the completed state
    const updatedActionItem = await prisma.actionItem.update({
      where: { id },
      data: { completed }
    });

    console.log(`Action item ${id} completion status set to ${completed} by user ${user.name}`);

    return NextResponse.json({
      message: 'Action item updated successfully',
      actionItem: updatedActionItem
    });

  } catch (err: any) {
    console.error('Error updating action item status:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
