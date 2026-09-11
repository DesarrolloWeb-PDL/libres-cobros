import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/api/admin/institutions' + request.nextUrl.search, request.url));
}

export async function POST(request: NextRequest) {
  return NextResponse.redirect(new URL('/api/admin/institutions' + request.nextUrl.search, request.url));
}
