-- Parche integral de base de datos para Gusto Admin

-- 1. Agregar las columnas faltantes en la tabla store_config
ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS delivery_base_price numeric DEFAULT 1500;
ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS delivery_free_base_km numeric DEFAULT 2;
ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS delivery_price_per_extra_km numeric DEFAULT 800;

-- Asegurarnos de que el registro con id 1 exista y actualizar variables de ser necesario
INSERT INTO public.store_config (id, is_open, whatsapp_number, delivery_base_price, delivery_free_base_km, delivery_price_per_extra_km)
VALUES (1, true, '5493834968345', 1500, 2, 800)
ON CONFLICT (id) DO UPDATE SET 
    whatsapp_number = COALESCE(public.store_config.whatsapp_number, EXCLUDED.whatsapp_number),
    delivery_base_price = COALESCE(public.store_config.delivery_base_price, EXCLUDED.delivery_base_price),
    delivery_free_base_km = COALESCE(public.store_config.delivery_free_base_km, EXCLUDED.delivery_free_base_km),
    delivery_price_per_extra_km = COALESCE(public.store_config.delivery_price_per_extra_km, EXCLUDED.delivery_price_per_extra_km);

-- 2. Agregar la columna offer_id en products para el sistema de Promociones
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS offer_id bigint REFERENCES public.special_offers(id) ON DELETE SET NULL;
