import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rcjztsjbhsnxmrchuyvd.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjanp0c2piaHNueG1yY2h1eXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzMzMDUsImV4cCI6MjA4ODc0OTMwNX0.uWpwqPOB94_atJxXOpvwQuhJ94N6f8rPE6iO0xCQQ0Y';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Conectando a Supabase Realtime (store_config)...");

const channel = supabase
  .channel('test-realtime-config')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'store_config' }, (payload) => {
    console.log("🔥 EVENTO STORE_CONFIG RECIBIDO 🔥", payload);
  })
  .subscribe(async (status, err) => {
    console.log("Estado:", status);
    if (status === 'SUBSCRIBED') {
      console.log("Forzando un Update en la Tienda... Espera a ver si hay ecos.");
      // Forzar un UPDATE falso al mismo valor para ver si despide el evento
      const { data } = await supabase.from('store_config').select('is_open').eq('id', 1).single();
      await supabase.from('store_config').update({ is_open: data?.is_open || true }).eq('id', 1);
    }
  });

setTimeout(() => {
    console.log("Saliendo...");
    process.exit(0);
}, 5000);
