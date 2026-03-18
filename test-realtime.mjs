import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rcjztsjbhsnxmrchuyvd.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjanp0c2piaHNueG1yY2h1eXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzMzMDUsImV4cCI6MjA4ODc0OTMwNX0.uWpwqPOB94_atJxXOpvwQuhJ94N6f8rPE6iO0xCQQ0Y';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Conectando a Supabase Realtime...");

const channel = supabase
  .channel('test-realtime')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
    console.log("🔥 EVENTO RECIBIDO 🔥", payload);
  })
  .subscribe((status, err) => {
    console.log("Estado de conexión:", status);
    if (err) {
      console.error("Error de WebSocket:", err);
    }
    
    if (status === 'SUBSCRIBED') {
      console.log("✅ Suscrito exitosamente a la tabla 'orders'. Inyectando un pedido falso para probar...");
      
      // Intentar insertar una orden dummy para forzar el trigger
      setTimeout(async () => {
         const { data, error } = await supabase.from('orders').insert([{
             customer_name: 'TEST WEBSOCKET',
             customer_phone: '123456789',
             total: 9999,
             status: 'pending',
             payment_method: 'cash',
             delivery_method: 'pickup'
         }]).select();
         
         if (error) console.error("Error inyectando orden falsa:", error);
         else {
             console.log("Orden falsa creada con ID:", data[0].id);
             // Limpiar después de 3 segundos
             setTimeout(async () => {
                 await supabase.from('orders').delete().eq('id', data[0].id);
                 console.log("Orden falsa eliminada. Saliendo...");
                 process.exit(0);
             }, 3000);
         }
      }, 1000);
    }
  });

setTimeout(() => {
    console.log("Timeout de 10 segundos alcanzado. El test falló o no llegaron eventos.");
    process.exit(1);
}, 10000);
