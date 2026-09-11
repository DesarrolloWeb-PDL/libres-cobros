import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.redirect(new URL('/api/admin/institutions/logo' + request.nextUrl.search, request.url));
}
