-- 1. Gestión de Mozos
CREATE TABLE IF NOT EXISTS waiters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    pin_code TEXT NOT NULL, -- Código de 4-6 dígitos para acceso móvil
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Relacionar sesión con mozo
ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS waiter_id UUID REFERENCES waiters(id);

-- 2. Notas de Comanda (Asegurar que exista en order_items y orders)
-- Nota: La columna 'note' ya suele existir en American Pizza en order_items, 
-- pero nos aseguramos de que sea consistente para salón.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- 3. Sistema de Reservas
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS reservation_info JSONB; -- {name: string, time: string, people: number}

-- Insertar mozo de prueba
INSERT INTO waiters (name, pin_code) VALUES ('Mozo Prueba', '1234');
