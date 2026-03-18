-- Agregar la columna offer_id como llave foránea hacia special_offers
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS offer_id bigint REFERENCES public.special_offers(id);
