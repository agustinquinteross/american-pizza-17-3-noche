-- Agregar campos de gestión a sesiones de mesa
ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0;
ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0;
ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS notes text;

-- Asegurar que las mesas tengan coordenadas para el Modo Diseño
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS x_pos int DEFAULT 0;
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS y_pos int DEFAULT 0;
