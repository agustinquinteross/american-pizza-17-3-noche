-- MASTER DATABASE SYNC - AMERICAN PIZZA (RAILWAY / POSTGRES)
-- Ejecuta este script para asegurar que todas las tablas y columnas necesarias existan.

-- 0. Extensiones Necesarias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tablas Base (si no existen)
CREATE TABLE IF NOT EXISTS categories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  sort_order integer DEFAULT 0
);

-- 2. Productos y Stock
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS offer_id bigint;

-- 3. Ofertas Especiales
CREATE TABLE IF NOT EXISTS special_offers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  description text,
  type text NOT NULL,
  discount_value text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Sistema de Salón (Zonas y Mesas)
CREATE TABLE IF NOT EXISTS restaurant_zones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  zone_id bigint REFERENCES restaurant_zones(id) ON DELETE CASCADE,
  label text NOT NULL,
  status text DEFAULT 'libre',
  x_pos int DEFAULT 0,
  y_pos int DEFAULT 0,
  shape text DEFAULT 'square',
  is_active boolean DEFAULT true,
  reservation_info jsonb,
  active_session_id uuid
);

-- Asegurar columnas si la tabla ya existía
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS status text DEFAULT 'libre';
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS x_pos int DEFAULT 0;
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS y_pos int DEFAULT 0;
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS shape text DEFAULT 'square';
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS reservation_info jsonb;
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS active_session_id uuid;
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS zone_id bigint REFERENCES restaurant_zones(id) ON DELETE CASCADE;

-- 5. Sesiones de Mesa (Cuentas)
CREATE TABLE IF NOT EXISTS table_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id bigint REFERENCES restaurant_tables(id),
  waiter_id uuid, -- Relación con mozos si existe la tabla
  total numeric DEFAULT 0,
  status text DEFAULT 'open',
  payment_method text,
  discount numeric DEFAULT 0,
  subtotal numeric DEFAULT 0,
  notes text,
  is_design_mode boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  closed_at timestamp with time zone
);

-- 6. Banners Publicitarios
CREATE TABLE IF NOT EXISTS banners (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text,
  image_url text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 7. Sistema de Modificadores (Extras)
CREATE TABLE IF NOT EXISTS modifier_groups (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  min_selection integer DEFAULT 0,
  max_selection integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modifier_options (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  group_id bigint REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric DEFAULT 0,
  is_available boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS product_modifiers (
  product_id bigint REFERENCES products(id) ON DELETE CASCADE,
  group_id bigint REFERENCES modifier_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, group_id)
);

-- 8. Pedidos (Orders) - Columnas Críticas para Salón
ALTER TABLE orders ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES table_sessions(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_id bigint REFERENCES restaurant_tables(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_label text;

-- 7. Items de Pedido
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS internal_notes text;

-- 8. Habilitar Realtime para todo (Supabase)
-- Nota: Esto puede fallar si no tienes permisos de superusuario, ignora si da error
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_zones, restaurant_tables, table_sessions, orders, products;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'No se pudo habilitar Realtime automáticamente. Hazlo manual en el dashboard de Supabase.';
END $$;
