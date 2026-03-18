-- Crear tabla de Zonas
create table restaurant_zones (
  id bigint primary key generated always as identity,
  name text not null,
  is_active boolean default true
);

-- Crear tabla de Mesas
create table restaurant_tables (
  id bigint primary key generated always as identity,
  zone_id bigint references restaurant_zones(id) on delete cascade,
  label text not null, -- Ej: "Mesa 1"
  status text default 'libre', -- 'libre', 'ocupada', 'reservada', 'por_limpiar'
  x_pos int default 0,
  y_pos int default 0
);

-- Modificar tabla de Pedidos para integrarlos con Mesas (opcional para delivery/retiro)
alter table orders add column table_id bigint references restaurant_tables(id);

-- Habilitar Realtime para las nuevas tablas
alter publication supabase_realtime add table restaurant_zones;
alter publication supabase_realtime add table restaurant_tables;

-- Insertar zona por defecto
insert into restaurant_zones (name) values ('Salón Principal');
