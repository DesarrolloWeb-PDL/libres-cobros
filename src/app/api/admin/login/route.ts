import { NextRequest } from 'next/server';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';

const LoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('Invalid credentials', 400, parsed.error.message);
    }

    const { email, password } = parsed.data;

    const user = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!user) {
      return apiError('Invalid credentials', 401);
    }

    const isValid = await compare(password, user.passwordHash);

    if (!isValid) {
      return apiError('Invalid credentials', 401);
    }

    return apiSuccess({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    return apiDbError(error, 'Login failed');
  }
}

export async function DELETE() {
  return apiSuccess({ ok: true });
}
