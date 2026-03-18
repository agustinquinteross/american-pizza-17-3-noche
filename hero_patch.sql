-- FASE 3: HERO DINÁMICO (GUSTO V2)
-- Añadir campos para personalizar la cabecera desde el panel de control.

ALTER TABLE public.store_config 
ADD COLUMN IF NOT EXISTS logo_url text;

ALTER TABLE public.store_config 
ADD COLUMN IF NOT EXISTS hero_bg_url text;

ALTER TABLE public.store_config 
ADD COLUMN IF NOT EXISTS use_hero_bg boolean DEFAULT false;
