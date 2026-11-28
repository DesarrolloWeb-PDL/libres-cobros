import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getInstitutionSiteConfigValues } from '@/lib/site-config';
import { LANDING_KEYS, readLandingContent } from '@/lib/landing';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  // Public read-only content consumed by standalone landing sites hosted
  // anywhere (spec S4): the landing may live on another domain.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonWithCors(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const club = await prisma.club.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      status: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
      bgColor: true,
    },
  });

  if (!club || club.status !== 'ACTIVE') {
    return jsonWithCors({ error: 'Institución no encontrada' }, 404);
  }

  const values = await getInstitutionSiteConfigValues(club.id, Object.values(LANDING_KEYS));
  const content = readLandingContent(values);

  return jsonWithCors({
    club: {
      name: club.name,
      slug: club.slug,
      logoUrl: club.logoUrl,
      primaryColor: club.primaryColor,
      secondaryColor: club.secondaryColor,
      accentColor: club.accentColor,
      bgColor: club.bgColor,
    },
    landing: {
      cover: content.cover,
      events: content.events,
      authorities: content.authorities,
      contacts: content.contacts,
      history: content.history,
      appearance: content.appearance,
      backgrounds: content.backgrounds,
    },
  });
}
