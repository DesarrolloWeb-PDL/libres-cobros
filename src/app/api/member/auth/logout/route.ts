import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/member-auth';

/** Clears the member-session cookie (portal logout). */
export async function POST() {
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        'Set-Cookie': `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      },
    }
  );
}
