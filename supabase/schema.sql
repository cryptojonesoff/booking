-- TT Ticketing Platform — v1 schema (PULO 001 scope)
-- Run this in the Supabase SQL editor (or via `supabase db push` once linked).

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,              -- 'pulo-001'
  name text not null,
  description text,
  start_date date,
  end_date date,
  location text,
  status text default 'draft',            -- draft | live | closed
  cif_percentage numeric(5,2) not null default 5.00,  -- configurable per project, applied at checkout
  created_at timestamptz default now()
);

create table if not exists ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  name text not null,                     -- e.g. 'Full Residency Pass', 'Day Experience'
  description text,
  capacity integer,                       -- null = unlimited
  sold_count integer default 0,
  sort_order integer default 0,
  active boolean default true,
  unique (product_id, name)
);

-- Multi-currency pricing: one row per (tier, currency). A tier only sells
-- in the currencies it has a row for — buyer picks currency, checkout looks
-- up the matching row.
create table if not exists ticket_tier_prices (
  id uuid primary key default gen_random_uuid(),
  ticket_tier_id uuid references ticket_tiers(id) on delete cascade,
  currency text not null,                 -- 'usd' | 'eur' | 'aud' | 'php'
  price_cents integer not null,
  unique (ticket_tier_id, currency)
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  ticket_tier_id uuid references ticket_tiers(id),
  buyer_name text not null,
  buyer_email text not null,
  quantity integer not null default 1,
  currency text not null default 'usd',
  amount_total_cents integer not null,
  cif_contribution_cents integer not null default 0,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  status text default 'pending',          -- pending | paid | failed | refunded
  created_at timestamptz default now()
);

create table if not exists vouchers (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  code text unique not null,              -- short human-readable code, e.g. PULO-XK4R9
  type text default 'fixed_ticket',       -- 'fixed_ticket' now; 'credit' / 'flex_credit' reserved for later
  redeemed boolean default false,
  redeemed_at timestamptz,
  created_at timestamptz default now()
);

-- Seed PULO 001 with placeholder tiers/prices (USD only for now — swap for
-- real pricing + add eur/aud/php rows once Jonas provides Pricing Guidelines 2026).
insert into products (slug, name, description, start_date, end_date, location, status, cif_percentage)
values ('pulo-001', 'PULO 001', 'Creative residency, Siargao x Bali, produced with Pulau Projects.', '2026-10-31', '2026-11-10', 'Siargao & Bali', 'draft', 5.00)
on conflict (slug) do nothing;

insert into ticket_tiers (product_id, name, description, capacity, sort_order)
select id, 'Full Residency Pass', null, 20, 1 from products where slug = 'pulo-001'
on conflict (product_id, name) do nothing;

insert into ticket_tiers (product_id, name, description, capacity, sort_order)
select id, 'Day Experience', null, 40, 2 from products where slug = 'pulo-001'
on conflict (product_id, name) do nothing;

insert into ticket_tiers (product_id, name, description, capacity, sort_order)
select id, 'Chef''s Table Dinner', null, 30, 3 from products where slug = 'pulo-001'
on conflict (product_id, name) do nothing;

insert into ticket_tier_prices (ticket_tier_id, currency, price_cents)
select t.id, 'usd', 27000  -- placeholder: ~$270, replace with real pricing
from ticket_tiers t join products p on p.id = t.product_id
where p.slug = 'pulo-001' and t.name = 'Full Residency Pass'
on conflict (ticket_tier_id, currency) do nothing;

insert into ticket_tier_prices (ticket_tier_id, currency, price_cents)
select t.id, 'usd', 4500  -- placeholder: ~$45
from ticket_tiers t join products p on p.id = t.product_id
where p.slug = 'pulo-001' and t.name = 'Day Experience'
on conflict (ticket_tier_id, currency) do nothing;

insert into ticket_tier_prices (ticket_tier_id, currency, price_cents)
select t.id, 'usd', 8100  -- placeholder: ~$81
from ticket_tiers t join products p on p.id = t.product_id
where p.slug = 'pulo-001' and t.name = 'Chef''s Table Dinner'
on conflict (ticket_tier_id, currency) do nothing;

-- Atomic capacity increment, called from the Stripe webhook so concurrent
-- paid orders for the same tier can't race each other's sold_count update.
create or replace function increment_tier_sold_count(tier_id uuid, by integer)
returns void as $$
begin
  update ticket_tiers set sold_count = sold_count + by where id = tier_id;
end;
$$ language plpgsql;

-- RLS: enabled on every table. products/ticket_tiers/ticket_tier_prices get
-- an anon-readable policy (needed for the public /pulo pages using the
-- anon key). orders/vouchers get NO anon policy at all — buyer name/email
-- and voucher codes are only ever read/written server-side via the
-- service-role client (lib/supabase/admin.ts), used by /api/checkout,
-- the Stripe webhook, and the admin dashboard.
alter table products enable row level security;
alter table ticket_tiers enable row level security;
alter table ticket_tier_prices enable row level security;
alter table orders enable row level security;
alter table vouchers enable row level security;

create policy "Public read access" on products for select using (true);
create policy "Public read access" on ticket_tiers for select using (true);
create policy "Public read access" on ticket_tier_prices for select using (true);
-- No policies on orders/vouchers — anon key has zero access; only the
-- service-role key (which bypasses RLS entirely) can touch them.
