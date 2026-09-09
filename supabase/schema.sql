-- TT Ticketing Platform — v1 schema (PULO 001 scope)
-- Run this in the Supabase SQL editor (or via `supabase db push` once linked).
-- Safe to re-run: tables/functions use if-not-exists guards, seeds use
-- on-conflict-do-nothing, and the old placeholder tier catalog is explicitly
-- replaced below (see "PULO x Pulau catalog").

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
  name text not null,                     -- e.g. 'Week 1 Pass — With Accommodation'
  description text,
  capacity integer,                       -- null = unlimited; this SKU's own sales cap, separate
                                           -- from the shared field_activations capacity below
  sold_count integer default 0,
  sort_order integer default 0,
  active boolean default true,
  unique (product_id, name)
);

-- Perk flags a tier includes. No separate stock/capacity for these per
-- Jonas — they only need to be countable per paid order (e.g. "how many
-- rooms do we need to book, how many airport transfers to organise").
alter table ticket_tiers add column if not exists includes_gym boolean default false;
alter table ticket_tiers add column if not exists includes_accommodation boolean default false;
alter table ticket_tiers add column if not exists includes_airport_transfer boolean default false;

-- The public "field activation" dinners (from the programme). This is the
-- shared-inventory pool: a physical dinner has one capacity, drawn down by
-- every tier that grants access to it (standalone ticket AND any bundle
-- that includes it), not one pool per tier.
create table if not exists field_activations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  name text not null,                     -- e.g. 'PULO Field Activation — Day 7'
  description text,
  sort_order integer default 0,
  capacity integer,                       -- null = unlimited
  sold_count integer default 0,
  unique (product_id, name)
);

-- Which field activation(s) a tier grants access to. Standalone activation
-- tickets link to exactly one row here; week/2-week bundles link to several.
create table if not exists ticket_tier_activations (
  id uuid primary key default gen_random_uuid(),
  ticket_tier_id uuid references ticket_tiers(id) on delete cascade,
  field_activation_id uuid references field_activations(id) on delete cascade,
  unique (ticket_tier_id, field_activation_id)
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

-- One ticket per person (one row per unit of orders.quantity) — not one
-- code per order. This replaces the earlier "vouchers" table, which only
-- ever produced a single code per order regardless of quantity.
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  code text unique not null,              -- short human-readable code, e.g. PULO-XK4R9
  created_at timestamptz default now()
);

-- Per-activation check-in state for a ticket. A standalone ticket gets one
-- row; a bundle ticket (e.g. 2-Week Pass) gets one row per field activation
-- it covers, so each dinner can be checked in independently.
create table if not exists ticket_redemptions (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete cascade,
  field_activation_id uuid references field_activations(id),
  redeemed boolean default false,
  redeemed_at timestamptz,
  unique (ticket_id, field_activation_id)
);

drop table if exists vouchers;

-- Seed PULO 001 (the PULO x Pulau residency, Siargao — dates/location
-- already on the product row).
insert into products (slug, name, description, start_date, end_date, location, status, cif_percentage)
values ('pulo-001', 'PULO 001', 'Creative residency, Siargao x Bali, produced with Pulau Projects.', '2026-10-31', '2026-11-10', 'Siargao & Bali', 'draft', 5.00)
on conflict (slug) do nothing;

-- Old placeholder catalog (pre-dates the PULO x Pulau field-activation/
-- bundle structure) — replaced below. Safe to drop: pre-launch, no paid
-- orders exist against these yet.
delete from ticket_tier_prices where ticket_tier_id in (
  select t.id from ticket_tiers t
  join products p on p.id = t.product_id
  where p.slug = 'pulo-001'
    and t.name in ('Full Residency Pass', 'Day Experience', 'Chef''s Table Dinner')
);
delete from ticket_tiers t using products p
where t.product_id = p.id
  and p.slug = 'pulo-001'
  and t.name in ('Full Residency Pass', 'Day Experience', 'Chef''s Table Dinner');

-- ── PULO x Pulau catalog ────────────────────────────────────────────────
-- Field activations = the 4 public dinners from the programme. Capacity is
-- placeholder — swap once Jonas confirms real venue capacity per dinner.
insert into field_activations (product_id, name, description, sort_order, capacity)
select id, 'Mei Mei Field Activation — Days 1–7', 'Mei Mei R&D + restaurant takeover, fire & farmers.', 1, 40
from products where slug = 'pulo-001'
on conflict (product_id, name) do nothing;

insert into field_activations (product_id, name, description, sort_order, capacity)
select id, 'PULO Field Activation — Day 7', 'YUKI + Mei Mei, meeting point between both Field Weeks.', 2, 60
from products where slug = 'pulo-001'
on conflict (product_id, name) do nothing;

insert into field_activations (product_id, name, description, sort_order, capacity)
select id, 'YUKI Field Activation — Days 8–14', 'YUKI R&D + restaurant takeover, seafood & ocean.', 3, 40
from products where slug = 'pulo-001'
on conflict (product_id, name) do nothing;

insert into field_activations (product_id, name, description, sort_order, capacity)
select id, 'Pulau Exclusive Chef''s Table — Day 14', 'YUKI + Mei Mei, "PULO House" finale.', 4, 20
from products where slug = 'pulo-001'
on conflict (product_id, name) do nothing;

-- Standalone tickets — one per field activation, so anyone can attend a
-- single dinner without buying a bundle.
insert into ticket_tiers (product_id, name, description, sort_order)
select id, 'Mei Mei Field Activation Ticket', 'Days 1–7 dinner only.', 1 from products where slug = 'pulo-001'
on conflict (product_id, name) do nothing;

insert into ticket_tiers (product_id, name, description, sort_order)
select id, 'PULO Field Activation Ticket', 'Day 7 dinner only.', 2 from products where slug = 'pulo-001'
on conflict (product_id, name) do nothing;

insert into ticket_tiers (product_id, name, description, sort_order)
select id, 'YUKI Field Activation Ticket', 'Days 8–14 dinner only.', 3 from products where slug = 'pulo-001'
on conflict (product_id, name) do nothing;

insert into ticket_tiers (product_id, name, description, sort_order)
select id, 'Pulau Exclusive Chef''s Table Ticket', 'Day 14 finale dinner only, 20pax.', 4 from products where slug = 'pulo-001'
on conflict (product_id, name) do nothing;

-- Week 1 — Mei Mei Field Activation + PULO Field Activation + Gym.
insert into ticket_tiers (product_id, name, description, sort_order, includes_gym)
select id, 'Week 1 Pass — Ticket Only', 'Days 1–7 + Day 7 field activations, gym access.', 5, true
from products where slug = 'pulo-001'
on conflict (product_id, name) do nothing;

insert into ticket_tiers (product_id, name, description, sort_order, includes_gym, includes_accommodation, includes_airport_transfer)
select id, 'Week 1 Pass — With Accommodation', 'Days 1–7 + Day 7 field activations, gym, accommodation & airport transfer.', 6, true, true, true
from products where slug = 'pulo-001'
on conflict (product_id, name) do nothing;

-- Week 2 — PULO Field Activation + YUKI Field Activation + Chef's Table + Gym.
insert into ticket_tiers (product_id, name, description, sort_order, includes_gym)
select id, 'Week 2 Pass — Ticket Only', 'Day 7 + Days 8–14 + Day 14 field activations, gym access.', 7, true
from products where slug = 'pulo-001'
on conflict (product_id, name) do nothing;

insert into ticket_tiers (product_id, name, description, sort_order, includes_gym, includes_accommodation, includes_airport_transfer)
select id, 'Week 2 Pass — With Accommodation', 'Day 7 + Days 8–14 + Day 14 field activations, gym, accommodation & airport transfer.', 8, true, true, true
from products where slug = 'pulo-001'
on conflict (product_id, name) do nothing;

-- 2 Weeks — all 4 field activations + Gym.
insert into ticket_tiers (product_id, name, description, sort_order, includes_gym)
select id, '2-Week Pass — Ticket Only', 'All 4 field activations, gym access.', 9, true
from products where slug = 'pulo-001'
on conflict (product_id, name) do nothing;

insert into ticket_tiers (product_id, name, description, sort_order, includes_gym, includes_accommodation, includes_airport_transfer)
select id, '2-Week Pass — With Accommodation', 'All 4 field activations, gym, accommodation & airport transfer.', 10, true, true, true
from products where slug = 'pulo-001'
on conflict (product_id, name) do nothing;

-- ticket_tier_activations — declares which field activation(s) each tier unlocks.
insert into ticket_tier_activations (ticket_tier_id, field_activation_id)
select t.id, fa.id
from ticket_tiers t
join products p on p.id = t.product_id
join field_activations fa on fa.product_id = p.id
where p.slug = 'pulo-001'
  and (
    (t.name = 'Mei Mei Field Activation Ticket' and fa.name = 'Mei Mei Field Activation — Days 1–7') or
    (t.name = 'PULO Field Activation Ticket' and fa.name = 'PULO Field Activation — Day 7') or
    (t.name = 'YUKI Field Activation Ticket' and fa.name = 'YUKI Field Activation — Days 8–14') or
    (t.name = 'Pulau Exclusive Chef''s Table Ticket' and fa.name = 'Pulau Exclusive Chef''s Table — Day 14') or
    (t.name in ('Week 1 Pass — Ticket Only', 'Week 1 Pass — With Accommodation')
      and fa.name in ('Mei Mei Field Activation — Days 1–7', 'PULO Field Activation — Day 7')) or
    (t.name in ('Week 2 Pass — Ticket Only', 'Week 2 Pass — With Accommodation')
      and fa.name in ('PULO Field Activation — Day 7', 'YUKI Field Activation — Days 8–14', 'Pulau Exclusive Chef''s Table — Day 14')) or
    (t.name in ('2-Week Pass — Ticket Only', '2-Week Pass — With Accommodation')
      and fa.name in ('Mei Mei Field Activation — Days 1–7', 'PULO Field Activation — Day 7', 'YUKI Field Activation — Days 8–14', 'Pulau Exclusive Chef''s Table — Day 14'))
  )
on conflict (ticket_tier_id, field_activation_id) do nothing;

-- Placeholder USD pricing — replace once Jonas provides Pricing Guidelines 2026.
insert into ticket_tier_prices (ticket_tier_id, currency, price_cents)
select t.id, 'usd', v.price_cents
from ticket_tiers t
join products p on p.id = t.product_id
join (values
  ('Mei Mei Field Activation Ticket', 9000),
  ('PULO Field Activation Ticket', 7000),
  ('YUKI Field Activation Ticket', 9000),
  ('Pulau Exclusive Chef''s Table Ticket', 15000),
  ('Week 1 Pass — Ticket Only', 25000),
  ('Week 1 Pass — With Accommodation', 45000),
  ('Week 2 Pass — Ticket Only', 32000),
  ('Week 2 Pass — With Accommodation', 56000),
  ('2-Week Pass — Ticket Only', 50000),
  ('2-Week Pass — With Accommodation', 85000)
) as v(name, price_cents) on v.name = t.name
where p.slug = 'pulo-001'
on conflict (ticket_tier_id, currency) do nothing;

-- Atomic capacity increments, called from the Stripe webhook so concurrent
-- paid orders can't race each other's sold_count update.
create or replace function increment_tier_sold_count(tier_id uuid, by integer)
returns void as $$
begin
  update ticket_tiers set sold_count = sold_count + by where id = tier_id;
end;
$$ language plpgsql;

-- Increments every field_activation a tier grants access to in one
-- statement — this is the shared-capacity accounting: a standalone Day 7
-- ticket and a Week 1/Week 2/2-Week bundle that also covers Day 7 all draw
-- down the same field_activations.sold_count.
create or replace function increment_activation_sold_counts(activation_ids uuid[], by integer)
returns void as $$
begin
  update field_activations set sold_count = sold_count + by where id = any(activation_ids);
end;
$$ language plpgsql;

-- RLS: enabled on every table. products/ticket_tiers/ticket_tier_prices/
-- field_activations/ticket_tier_activations get an anon-readable policy
-- (needed for the public /pulo pages using the anon key, incl. live
-- availability per field activation). orders/tickets/ticket_redemptions get
-- NO anon policy at all — buyer name/email and ticket codes are only ever
-- read/written server-side via the service-role client
-- (lib/supabase/admin.ts), used by /api/checkout, the Stripe webhook, and
-- the admin dashboard.
alter table products enable row level security;
alter table ticket_tiers enable row level security;
alter table ticket_tier_prices enable row level security;
alter table field_activations enable row level security;
alter table ticket_tier_activations enable row level security;
alter table orders enable row level security;
alter table tickets enable row level security;
alter table ticket_redemptions enable row level security;

drop policy if exists "Public read access" on products;
drop policy if exists "Public read access" on ticket_tiers;
drop policy if exists "Public read access" on ticket_tier_prices;
drop policy if exists "Public read access" on field_activations;
drop policy if exists "Public read access" on ticket_tier_activations;

create policy "Public read access" on products for select using (true);
create policy "Public read access" on ticket_tiers for select using (true);
create policy "Public read access" on ticket_tier_prices for select using (true);
create policy "Public read access" on field_activations for select using (true);
create policy "Public read access" on ticket_tier_activations for select using (true);
-- No policies on orders/tickets/ticket_redemptions — anon key has zero
-- access; only the service-role key (which bypasses RLS entirely) can
-- touch them.
