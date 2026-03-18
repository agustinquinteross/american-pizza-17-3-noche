console.log('[Pusher-Server] Cargando módulo...');
const appId = process.env.PUSHER_APP_ID;
const key = process.env.PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.PUSHER_CLUSTER;

console.log('[Pusher-Server] Variables:', { appId: !!appId, key: !!key, secret: !!secret, cluster: !!cluster });

let pusherInstance;
try {
  pusherInstance = new Pusher({
    appId: appId || '',
    key: key || '',
    secret: secret || '',
    cluster: cluster || 'sa1',
    useTLS: true,
  });
  console.log('[Pusher-Server] Instancia creada.');
} catch (err) {
  console.error('[Pusher-Server] ERROR al crear instancia:', err);
}

export const pusherServer = pusherInstance;
