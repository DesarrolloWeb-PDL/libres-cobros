import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
};

export default function PagosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
