-- Habilitar Realtime Total para American Pizza
BEGIN;
  -- Asegurar que la publicación existe
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END
  $$;

  -- Intentar agregar tablas (ignorando si ya están)
  -- Nota: En Postgres no hay "ADD TABLE IF NOT EXISTS", así que lo hacemos por tabla
  DO $$
  DECLARE
    t_name text;
    tables_to_add text[] := ARRAY[
      'products', 
      'categories', 
      'modifier_groups', 
      'modifier_options', 
      'restaurant_zones', 
      'restaurant_tables', 
      'table_sessions', 
      'orders', 
      'order_items',
      'store_config'
    ];
  BEGIN
    FOREACH t_name IN ARRAY tables_to_add LOOP
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t_name);
      EXCEPTION WHEN duplicate_object THEN
        -- Ignorar si ya está en la publicación
      END;
      
      -- Asegurar REPLICA IDENTITY FULL para todos los campos en UPDATE/DELETE
      EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', t_name);
    END LOOP;
  END
  $$;
COMMIT;
