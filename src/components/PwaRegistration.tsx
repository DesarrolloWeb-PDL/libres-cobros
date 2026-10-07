'use client';

import { useEffect } from 'react';

export function PwaRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Pick up fixed SW versions without a full manual cache wipe.
        registration.update().catch(() => {});
      })
      .catch(() => {});
  }, []);

  return null;
}
