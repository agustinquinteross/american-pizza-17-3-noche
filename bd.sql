-- 1. CREACIÓN DE TABLAS INDEPENDIENTES (Sin Claves Foráneas)
CREATE TABLE public.banners (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  image_url text NOT NULL,
  title text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT banners_pkey PRIMARY KEY (id)
);

CREATE TABLE public.categories (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.coupons (
  code text NOT NULL,
  discount_type text NOT NULL,
  value numeric NOT NULL,
  is_active boolean DEFAULT true,
  expires_at timestamp with time zone,
  usage_limit integer,
  times_used integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT coupons_pkey PRIMARY KEY (code)
);

CREATE TABLE public.modifier_groups (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  min_selection integer DEFAULT 0,
  max_selection integer DEFAULT 1,
  CONSTRAINT modifier_groups_pkey PRIMARY KEY (id)
);

CREATE TABLE public.orders (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text,
  total numeric NOT NULL,
  status text DEFAULT 'pending'::text,
  delivery_method text,
  payment_method text,
  coupon_code text,
  discount numeric DEFAULT 0,
  CONSTRAINT orders_pkey PRIMARY KEY (id)
);

CREATE TABLE public.special_offers (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL,
  discount_value text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT special_offers_pkey PRIMARY KEY (id)
);

CREATE TABLE public.store_config (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  is_open boolean DEFAULT true,
  CONSTRAINT store_config_pkey PRIMARY KEY (id)
);


-- 2. CREACIÓN DE TABLAS DEPENDIENTES (Con Claves Foráneas)
CREATE TABLE public.products (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  category_id bigint,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  image_url text,
  is_active boolean DEFAULT true,
  promo_tag text,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);

CREATE TABLE public.modifier_options (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  group_id bigint,
  name text NOT NULL,
  price numeric DEFAULT 0,
  is_available boolean DEFAULT true,
  CONSTRAINT modifier_options_pkey PRIMARY KEY (id),
  CONSTRAINT modifier_options_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.modifier_groups(id)
);

CREATE TABLE public.order_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id bigint,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  options text,
  note text,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE TABLE public.product_modifiers (
  product_id bigint NOT NULL,
  group_id bigint NOT NULL,
  CONSTRAINT product_modifiers_pkey PRIMARY KEY (product_id, group_id),
  CONSTRAINT product_modifiers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_modifiers_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.modifier_groups(id)
);

-- 3. DATOS INICIALES OBLIGATORIOS (El único registro necesario)
INSERT INTO public.store_config (id, is_open) VALUES (1, true);