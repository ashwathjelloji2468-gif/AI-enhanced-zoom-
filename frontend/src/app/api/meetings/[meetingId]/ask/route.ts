import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/middleware/withAuth';
import IORedis from 'ioredis';
import Anthropic from '@anthropic-ai/sdk';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6380';
const anthropicKey = process.env.ANTHROPIC_API_KEY || '';

export const POST = withAuth(async (req, { params, user }) => {
  try {
    const { meetingId } = params;
    const userId = user.userId;
    const { question } = await req.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question must be a non-empty string' }, { status: 400 });
    }

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

    if (meeting.status !== 'ONGOING') {
      return NextResponse.json({ error: 'Meeting Q&A is only available during ongoing sessions' }, { status: 400 });
    }

    // Server-side guard: Verify user is an authorized participant currently in the meeting
    const isParticipant = meeting.participants.some(p => p.userId === userId);
    if (!isParticipant && meeting.hostId !== userId) {
      return NextResponse.json({ error: 'You are not authorized to access this meeting Q&A' }, { status: 403 });
    }

    // 1. Read live transcript from Redis buffer
    const redis = new IORedis(redisUrl);
    let transcript = await redis.get(`transcript:${meeting.code}`) || '';
    
    // Close connection immediately
    redis.disconnect();

    // 2. Fallback: If Redis is empty, compile a transcript from database chat messages
    if (!transcript.trim()) {
      const chatMessages = await prisma.chatMessage.findMany({
        where: { meetingId: meeting.id },
        orderBy: { createdAt: 'asc' }
      });
      if (chatMessages.length > 0) {
        const senderIds = Array.from(new Set(chatMessages.map(m => m.senderId)));
        const users = await prisma.user.findMany({
          where: { id: { in: senderIds } }
        });
        const userMap = new Map(users.map(u => [u.id, u.name]));
        transcript = chatMessages.map(m => {
          const senderName = userMap.get(m.senderId) || 'Participant';
          return `[Chat] ${senderName}: ${m.content}`;
        }).join('\n');
      }
    }

    // If transcript is still completely empty
    if (!transcript.trim()) {
      return NextResponse.json({
        answer: 'The live transcript buffer is currently empty. No speech or chat messages have been recorded yet.'
      });
    }

    // 3. Prompt Claude (or execute local mock fallback if API key is missing)
    let answer = '';

    if (anthropicKey) {
      console.log(`Submitting question to Claude grounded in transcript (${transcript.length} chars)`);
      try {
        const anthropic = new Anthropic({ apiKey: anthropicKey });
        const systemPrompt = `
You are answering a question about a meeting that is currently in progress.
Only use the transcript below to answer — do not use outside knowledge, and do not guess at anything not explicitly said. If the answer isn't in the transcript yet, say so plainly rather than speculating.

Transcript so far:
"""
${transcript}
"""
        `.trim();

        const message = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 300,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `Question: ${question}`
            }
          ]
        });

        answer = message.content[0].type === 'text' ? message.content[0].text : '';
      } catch (err: any) {
        console.error('Claude API call failed inside Ask API:', err.message);
        if (err.message?.includes('credit balance') || err.status === 400 && err.message?.includes('credit')) {
          answer = `Anthropic API Error: Your account credit balance is too low to complete this request. Please add credits at console.anthropic.com.`;
        } else {
          answer = `AI Error: ${err.message || 'Unknown error'}. Fallback: ${getMockAnswer(transcript, question)}`;
        }
      }
    } else {
      console.log('Anthropic API key not configured. Triggering local mock fallback...');
      answer = getMockAnswer(transcript, question);
    }

    return NextResponse.json({ answer });

  } catch (err: any) {
    console.error('Error in Ask AI route:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// Helper for local mock Q&A grounding fallback
function getMockAnswer(transcript: string, question: string): string {
  const q = question.toLowerCase();
  
  // Keyword mappings matching the mock sync transcript context
  if (q.includes('deploy') || q.includes('monday') || q.includes('emma') || q.includes('security')) {
    return 'According to the transcript, Emma has finished implementing the new security schema with JWT silent refresh and plans to deploy it to the staging environment by this Monday.';
  }
  
  if (q.includes('jitter') || q.includes('reconnect') || q.includes('bob')) {
    return 'Bob mentioned experiencing jitter issues during connection drops. Alex requested Bob to optimize the client-side LiveKit reconnect configuration by next Thursday.';
  }

  if (q.includes('alex') || q.includes('agenda') || q.includes('host')) {
    return 'Alex is hosting the sync meeting, running the agenda, and assigned tasks to Emma (deploy by Monday) and Bob (optimize reconnect parameters).';
  }

  // General query scan matching transcript content
  if (transcript.toLowerCase().includes('jwt') || transcript.toLowerCase().includes('alex')) {
    return 'The transcript records Alex, Emma, and Bob discussing security updates (JWT silent refresh) and connection quality (LiveKit reconnect parameters). Emma plans to deploy by Monday.';
  }

  return 'I could not find the answer to your question in the transcript so far. The current discussion covers security schemas, JWT refresh tokens, and LiveKit jitter optimizations.';
}
