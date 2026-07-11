import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/bcrypt';
import { signupSchema } from '@/lib/validators/auth.schema';
import { signAccessToken, signRefreshToken, hashToken, cookieOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, name, password, avatarUrl } = result.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        avatarUrl: avatarUrl || null,
      },
    });

    // Sign tokens
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const rawRefreshToken = signRefreshToken({ userId: user.id });
    const hashedRefreshToken = hashToken(rawRefreshToken);

    // Save refresh token in DB
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: user.id,
        expiresAt: refreshExpiresAt,
      },
    });

    // Set response cookies
    const response = NextResponse.json(
      {
        message: 'Signup successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );

    response.cookies.set('access_token', accessToken, cookieOptions);
    response.cookies.set('refresh_token', rawRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during signup' },
      { status: 500 }
    );
  }
}
