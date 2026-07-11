import { z } from 'zod';

export const createMeetingSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(100, 'Title is too long').trim().default('Untitled Meeting'),
  scheduledAt: z.string().datetime({ message: 'Invalid ISO date string' }).optional().or(z.literal('')),
  waitingRoom: z.boolean().default(true),
  isLocked: z.boolean().default(false),
});

export const joinMeetingSchema = z.object({
  code: z.string().min(1, 'Meeting code is required').trim(),
  role: z.enum(['HOST', 'CO_HOST', 'PARTICIPANT']).default('PARTICIPANT'),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type JoinMeetingInput = z.infer<typeof joinMeetingSchema>;
