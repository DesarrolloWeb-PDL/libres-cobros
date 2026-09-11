import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/api/admin/institutions/current' + request.nextUrl.search, request.url));
}
