import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Public theme endpoint — returns the Super Admin site theme (no secrets).
 * Used by SuperAdminThemeInjector to color public pages (landing, login, registro).
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const theme = await prisma.siteConfig.findFirst({
      where: { clubId: null, key: 'theme' },
      select: {
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        bgColor: true,
      },
    });

    return NextResponse.json({ theme });
  } catch {
    return NextResponse.json({ theme: null });
  }
}
