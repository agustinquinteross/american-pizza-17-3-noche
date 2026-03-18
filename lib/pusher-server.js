import Pusher from 'pusher';

const appId = process.env.PUSHER_APP_ID;
const key   = process.env.PUSHER_KEY;
const secret  = process.env.PUSHER_SECRET;
const cluster = process.env.PUSHER_CLUSTER;

let pusherInstance;
try {
  if (appId && key && secret && cluster) {
    pusherInstance = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
    console.log('[Pusher-Server] ✅ Instancia creada correctamente.');
  } else {
    console.warn('[Pusher-Server] ⚠️ Faltan variables de entorno. Pusher deshabilitado.');
  }
} catch (err) {
  console.error('[Pusher-Server] ERROR al crear instancia:', err);
}

export const pusherServer = pusherInstance;
