-- Habilitar la transmisión en tiempo real para la tabla orders
BEGIN;
  -- Asegurar que la publicación existe (Supabase lo trae por defecto pero por si acaso)
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END
  $$;

  -- Agregar la tabla reservations a la publicación para que emita eventos
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  
  -- Asegurar la identidad completa para los UPDATE/DELETE (REPLICA IDENTITY FULL)
  ALTER TABLE orders REPLICA IDENTITY FULL;
COMMIT;
