'use client';

import { useEffect } from 'react';

// Shared channel for triggering cross-tab sync
let syncChannel: BroadcastChannel | null = null;

function getSyncChannel(): BroadcastChannel {
  if (!syncChannel) {
    syncChannel = new BroadcastChannel('mtc_sync');
  }
  return syncChannel;
}

export function useSync(callback: () => void) {
  useEffect(() => {
    const channel = getSyncChannel();
    const handler = (event: MessageEvent) => {
      if (event.data === 'sync') {
        callback();
      }
    };
    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
    };
  }, [callback]);

  const triggerSync = () => {
    getSyncChannel().postMessage('sync');
  };

  return { triggerSync };
}
