'use client';

import { useState } from 'react';
import Image from 'next/image';

interface AppScreenshotProps {
  src: string;
  alt: string;
  caption?: string;
  /** Aspect ratio hint, e.g. "16/9" or "4/3". Defaults to 16/9. */
  aspect?: string;
}

/**
 * Renders an app screenshot with a graceful placeholder when the file is missing.
 * Drop real screenshots into /public/screenshots/ (see docs) and they appear here.
 * Until then, shows a labelled placeholder so the layout never breaks.
 */
export function AppScreenshot({ src, alt, caption, aspect = '16/9' }: AppScreenshotProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <figure className="rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center">
        <div className="text-sm text-muted-foreground">
          <p className="font-medium">Screenshot pendiente</p>
          <p className="mt-1 text-xs">
            Agregá la imagen en <code className="font-mono">public{src}</code>
          </p>
        </div>
        {caption && <figcaption className="mt-3 text-xs text-muted-foreground">{caption}</figcaption>}
      </figure>
    );
  }

  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={675}
        className="h-auto w-full"
        style={{ aspectRatio: aspect }}
        onError={() => setFailed(true)}
      />
      {caption && (
        <figcaption className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
