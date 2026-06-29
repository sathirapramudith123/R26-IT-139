create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  email       text unique not null,
  password    text not null,
  created_at  timestamptz default now()
);

create table if not exists transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references users(id) on delete cascade,
  transaction_type text not null,
  payment_method   text not null,
  amount           numeric not null,
  description      text default '',
  category         text,
  created_at       timestamptz default now()
);

create table if not exists inventory (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references users(id) on delete cascade,
  name           text not null,
  supplier_name  text default 'Unknown Supplier',
  quantity       numeric not null default 0,
  reorder_level  numeric default 0,
  unit           text default 'unit',
  unit_price     numeric default 0,
  status         text default 'available',
  created_at     timestamptz default now()
);

create table if not exists suppliers (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references users(id) on delete cascade,
  name               text not null,
  company_name       text default 'N/A',
  contact_number     text not null,
  email              text default 'N/A',
  address            text default '',
  unit_price         numeric default 0,
  delivery_cost      numeric default 0,
  available_quantity numeric default 0,
  status             text default 'active',
  created_at         timestamptz default now()
);

create table if not exists procurement (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references users(id) on delete cascade,
  item_name              text not null,
  quantity               numeric not null,
  delivery_location      text,
  expected_selling_price numeric default 0,
  selected_supplier_name text,
  total_cost             numeric default 0,
  estimated_profit       numeric default 0,
  status                 text default 'pending',
  created_at             timestamptz default now()
);

create table if not exists agency_banking (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references users(id) on delete cascade,
  customer_name    text not null,
  customer_phone   text not null,
  transaction_type text not null,
  amount           numeric not null,
  service_fee      numeric default 0,
  commission       numeric default 0,
  created_offline  boolean default false,
  status           text default 'completed',
  created_at       timestamptz default now()
);

create table if not exists sync_queue (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  module      text not null,
  operation   text not null,
  record_id   text,
  payload     jsonb default '{}',
  status      text default 'queued',
  created_at  timestamptz default now()
);

alter table users add column if not exists reset_token text;
alter table users add column if not exists reset_token_expiry timestamptz;

alter table inventory add constraint quantity_non_negative check (quantity >= 0);
alter table inventory add constraint unit_price_non_negative check (unit_price >= 0);
alter table inventory add constraint reorder_non_negative check (reorder_level >= 0);
alter table inventory alter column unit_price type numeric(12,2);