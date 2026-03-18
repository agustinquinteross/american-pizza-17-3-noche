-- Políticas de Storage para Gusto
-- Permite Leer, Subir, Actualizar y Eliminar imágenes en los buckets menu-images y banners

-- Habilitar RLS explícitamente (por las dudas)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Permitir lectura pública (Select)
CREATE POLICY "Permitir lectura publica de imagenes" 
ON storage.objects FOR SELECT 
USING (bucket_id IN ('menu-images', 'banners'));

-- 2. Permitir subida (Insert)
CREATE POLICY "Permitir subida de imagenes" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id IN ('menu-images', 'banners'));

-- 3. Permitir borrado (Delete)
CREATE POLICY "Permitir borrado de imagenes" 
ON storage.objects FOR DELETE 
USING (bucket_id IN ('menu-images', 'banners'));

-- 4. Permitir actualizacion (Update)
CREATE POLICY "Permitir actualizacion de imagenes" 
ON storage.objects FOR UPDATE 
USING (bucket_id IN ('menu-images', 'banners'));
