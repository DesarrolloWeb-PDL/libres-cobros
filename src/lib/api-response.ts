import { NextResponse } from 'next/server';

export interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

export function apiError(
  message: string,
  status: number,
  details?: string,
  code?: string
): NextResponse<ApiError> {
  return NextResponse.json(
    { error: message, details, code } satisfies ApiError,
    { status }
  );
}

export function apiSuccess<T>(data: T): NextResponse<T> {
  return NextResponse.json(data);
}

export function apiDbError(
  error: unknown,
  fallback: string
): NextResponse<ApiError> {
  if (!(error instanceof Error)) {
    return apiError(fallback, 500);
  }

  let message = error.message;

  if (message.includes('Environment variable not found: DATABASE_URL')) {
    message = 'Incomplete configuration: DATABASE_URL is missing';
  } else if (message.includes('Environment variable not found: POSTGRES_URL')) {
    message = 'Incomplete configuration: POSTGRES_URL is missing';
  } else if (message.includes("Can't reach database server")) {
    message = 'Unable to connect to the database';
  } else if (message.includes('does not exist')) {
    message = 'Database is not migrated or tables are missing';
  }

  return apiError(message, 500, fallback);
}
