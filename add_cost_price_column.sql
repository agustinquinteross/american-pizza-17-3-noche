-- Agregar columna cost_price a la tabla products si no existe
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;
