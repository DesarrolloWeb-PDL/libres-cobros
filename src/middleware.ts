import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/admin/login',
  },
  callbacks: {
    authorized({ token }) {
      return token?.role === 'ADMIN';
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export const config = {
  matcher: ['/admin/:path*'],
};
