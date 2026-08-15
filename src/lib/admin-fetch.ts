import { cookies } from 'next/headers';

/**
 * Server-side fetch to the app's own API routes.
 *
 * Two requirements must hold at the same time:
 * - The fetch needs an ABSOLUTE URL: the Vercel runtime rejects relative
 *   paths with "Failed to parse URL" (ERR_INVALID_URL).
 * - It must forward the request cookies, otherwise getServerSession
 *   inside the route returns null and the request is rejected with 401.
 */
export async function adminFetch(
  path: string,
  errorMessage?: string
): Promise<Response> {
  const cookieStore = await cookies();
  const origin = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';

  const response = await fetch(`${origin}${path}`, {
    cache: 'no-store',
    headers: {
      cookie: cookieStore.toString(),
    },
  });

  if (!response.ok && errorMessage) {
    throw new Error(errorMessage);
  }

  return response;
}

