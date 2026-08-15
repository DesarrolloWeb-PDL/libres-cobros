'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/toast';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      {children}
      <Toaster />
    </SessionProvider>
  );
}
