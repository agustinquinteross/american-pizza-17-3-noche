-- Zonas del Restaurante
create table restaurant_zones (
  id bigint primary key generated always as identity,
  name text not null,
  is_active boolean default true
);

-- Mesas
create table restaurant_tables (
  id bigint primary key generated always as identity,
  zone_id bigint references restaurant_zones(id) on delete cascade,
  label text not null,
  status text default 'libre', -- 'libre', 'ocupada', 'cuenta_pedida', 'por_limpiar'
  x_pos int default 0,
  y_pos int default 0,
  active_session_id uuid
);

-- Sesiones de Mesa (La "Cuenta" abierta)
create table table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id bigint references restaurant_tables(id),
  waiter_name text,
  total numeric default 0,
  status text default 'open', -- 'open', 'closed'
  created_at timestamp with time zone default now(),
  closed_at timestamp with time zone
);

-- Vincular pedidos existentes a sesiones de mesa
alter table orders add column session_id uuid references table_sessions(id);
alter table orders add column table_label text; -- Para referencia rápida en cocina

-- Habilitar Realtime
alter publication supabase_realtime add table restaurant_zones, restaurant_tables, table_sessions;

-- Datos iniciales
insert into restaurant_zones (name) values ('Salón Principal'), ('Vereda');
