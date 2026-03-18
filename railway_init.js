const { Pool } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.*)/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1].trim() : process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: dbUrl,
});

const schema = `
-- 1. CREACIÓN DE TABLAS INDEPENDIENTES (Sin Claves Foráneas)

CREATE TABLE IF NOT EXISTS public.banners (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  image_url text NOT NULL,
  title text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.categories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  sort_order integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.coupons (
  code text PRIMARY KEY,
  discount_type text NOT NULL,
  value numeric NOT NULL,
  is_active boolean DEFAULT true,
  expires_at timestamp with time zone,
  usage_limit integer,
  times_used integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.modifier_groups (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  min_selection integer DEFAULT 0,
  max_selection integer DEFAULT 1,
  is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.special_offers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  description text,
  type text NOT NULL,
  discount_value text,
  is_active boolean DEFAULT true,
  valid_from timestamp with time zone,
  valid_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.store_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_open boolean DEFAULT true,
  whatsapp_number text,
  delivery_base_price numeric DEFAULT 1500,
  delivery_free_base_km numeric DEFAULT 2,
  delivery_price_per_extra_km numeric DEFAULT 800,
  logo_url text,
  hero_bg_url text,
  use_hero_bg boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.restaurant_zones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS waiters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    pin_code TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. CREACIÓN DE TABLAS DEPENDIENTES

CREATE TABLE IF NOT EXISTS public.products (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id bigint REFERENCES public.categories(id),
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  cost_price numeric DEFAULT 0,
  stock integer DEFAULT null,
  image_url text,
  is_active boolean DEFAULT true,
  promo_tag text,
  offer_id bigint REFERENCES public.special_offers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.modifier_options (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  group_id bigint REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric DEFAULT 0,
  is_available boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.product_modifiers (
  product_id bigint REFERENCES public.products(id) ON DELETE CASCADE,
  group_id bigint REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, group_id)
);

CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  zone_id bigint REFERENCES public.restaurant_zones(id) ON DELETE CASCADE,
  label text NOT NULL,
  status text DEFAULT 'libre',
  x_pos int DEFAULT 0,
  y_pos int DEFAULT 0,
  active_session_id uuid,
  reservation_info jsonb
);

CREATE TABLE IF NOT EXISTS public.table_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id bigint REFERENCES public.restaurant_tables(id),
  waiter_id uuid REFERENCES public.waiters(id),
  waiter_name text,
  total numeric DEFAULT 0,
  subtotal numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  status text DEFAULT 'open',
  payment_method text,
  is_design_mode boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  closed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text,
  total numeric NOT NULL,
  status text DEFAULT 'pending',
  delivery_method text,
  payment_method text,
  coupon_code text,
  discount numeric DEFAULT 0,
  table_id bigint REFERENCES public.restaurant_tables(id),
  table_label text,
  session_id uuid REFERENCES public.table_sessions(id)
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id bigint REFERENCES public.orders(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  options text,
  note text,
  internal_notes text
);

-- 3. DATOS INICIALES OBLIGATORIOS (Ignora duplicados si ya existe)
INSERT INTO public.store_config (id, is_open, whatsapp_number, delivery_base_price, delivery_free_base_km, delivery_price_per_extra_km)
VALUES (1, true, '5493834968345', 1500, 2, 800)
ON CONFLICT (id) DO NOTHING;

INSERT INTO restaurant_zones (name) 
SELECT 'Salón Principal' WHERE NOT EXISTS (SELECT 1 FROM restaurant_zones WHERE name = 'Salón Principal');

INSERT INTO waiters (name, pin_code) 
SELECT 'Admin', '1234' WHERE NOT EXISTS (SELECT 1 FROM waiters WHERE name = 'Admin');
`;

async function initDB() {
  try {
    console.log('Connecting to Railway DB...');
    await pool.query(schema);
    console.log('Database initialized successfully with all tables and columns.');
  } catch (err) {
    console.error('Error executing schema:', err);
  } finally {
    pool.end();
  }
}

initDB();
