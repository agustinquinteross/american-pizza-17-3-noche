-- Deshabilitar Temporalmente RLS o Forzar Política Pública para Realtime
BEGIN;

  -- 1. Intentamos asegurar que TODOS (incluyendo anon) puedan leer la tabla
  CREATE POLICY "Public Read Access" 
  ON orders 
  FOR SELECT 
  USING (true);

  -- 2. Si hay RLS encendido, esta política permite a Realtime mandar el evento al cliente anon
COMMIT;
