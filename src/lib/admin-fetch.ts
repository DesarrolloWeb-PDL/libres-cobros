import { cookies } from 'next/headers';

/**
 * Server-side fetch to the app's own API routes.
 *
 * Server Components that fetch their own /api routes must forward the
 * session cookie, otherwise getServerSession inside the route returns
 * null and the request is rejected with 401. Relative paths are resolved
 * by Next.js against the current request host, so no absolute URL is
 * needed and the previous `NEXT_PUBLIC_URL ?? localhost` fallback is gone.
 */
export async function adminFetch(
  path: string,
  errorMessage?: string
): Promise<Response> {
  const cookieStore = await cookies();

  const response = await fetch(path, {
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
