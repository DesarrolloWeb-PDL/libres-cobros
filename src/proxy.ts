import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ token }) {
      return (
        token?.role === 'ADMIN' || token?.role === 'SUPER_ADMIN'
      );
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export const config = {
  matcher: ['/admin/:path*'],
};
