'use client';

import { useEffect } from 'react';

export function useSync(callback: () => void) {
  useEffect(() => {
    const channel = new BroadcastChannel('mtc_sync');
    channel.onmessage = (event) => {
      if (event.data === 'sync') {
        callback();
      }
    };
    return () => {
      channel.close();
    };
  }, [callback]);

  const triggerSync = () => {
    const channel = new BroadcastChannel('mtc_sync');
    channel.postMessage('sync');
    channel.close();
  };

  return { triggerSync };
}
