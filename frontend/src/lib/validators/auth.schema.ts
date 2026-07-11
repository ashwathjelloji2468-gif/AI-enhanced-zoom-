import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  name: z.string().min(2, 'Name must be at least 2 characters long').max(50, 'Name must be under 50 characters').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  avatarUrl: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
