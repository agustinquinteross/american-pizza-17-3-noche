import PusherClient from 'pusher-js';

// Client-side Pusher (for listening to events)
const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

console.log('[Pusher-Client] Inicializando con:', { key: !!key, cluster: cluster || 'sa1' });

export const pusherClient = new PusherClient(key || '', {
  cluster: cluster || 'sa1',
});
