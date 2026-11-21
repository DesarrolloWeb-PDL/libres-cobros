import { GlowBackdrop } from '@/components/GlowBackdrop';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/30 p-4">
      <GlowBackdrop />
      <div className="relative w-full max-w-sm space-y-6">{children}</div>
    </div>
  );
}
