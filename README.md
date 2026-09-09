# booking — TT Ticketing Platform (v1: PULO 001)

Standalone booking/ticketing app for Table Talks. v1 scope is PULO 001 only —
see `docs/BRIEF.md` for the full brief and `docs/BUILD_PLAN.md` for the
approved build plan. Architected to generalize to other TT products and to
Made by Many later — not implemented as multi-tenant yet.

## Stack

Next.js 16 (App Router) · Supabase (Postgres + Auth) · Stripe Checkout · Resend · Vercel.

## Setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in Supabase / Stripe / Resend keys.
3. Run `supabase/schema.sql` in the Supabase SQL editor (creates tables + seeds the PULO x Pulau ticket catalog — field activations, standalone tickets, and week/2-week bundles).
4. `npm run dev`

## Data model notes (diverges from the original brief)

- **Multi-currency**: `ticket_tier_prices` holds one row per `(ticket_tier_id, currency)`. A tier only sells in the currencies it has a price row for. The buyer picks a currency before checkout.
- **CIF %**: lives on `products.cif_percentage` (numeric, default 5.00), not hardcoded — configurable per product/project.
- **Bundles with shared capacity**: `field_activations` holds the physical dinners (each with its own capacity); `ticket_tiers` are the sellable SKUs (standalone tickets + week/2-week bundles); `ticket_tier_activations` declares which activation(s) a tier grants access to. Standalone and bundle buyers alike draw from the same `field_activations.sold_count`, so a dinner can't be oversold across tiers — see `increment_activation_sold_counts` in `supabase/schema.sql`.
- **Perks, not inventory**: `ticket_tiers.includes_gym` / `includes_accommodation` / `includes_airport_transfer` are flags, not a stock table — they exist only to let `/admin` count "how many rooms/transfers to organise" from paid orders.
- **Tickets, not vouchers**: `tickets` holds one row per person (per unit of `orders.quantity`), each with its own code. `ticket_redemptions` holds one row per `(ticket, field_activation)` so a bundle ticket can be checked in separately at each dinner it covers.

## Routes (planned, per build plan)

- `/pulo`, `/pulo/checkout`, `/pulo/success`, `/pulo/cancel` — guest-facing, no auth.
- `/admin/*` — gated by Supabase Auth (single admin account), see `lib/supabase/middleware.ts` / `proxy.ts`.
- `/api/checkout`, `/api/webhooks/stripe` — Stripe Checkout session creation + webhook handler.

## Build order

Backend first (schema → `/pulo` → checkout → webhook, producing real order data), then the admin dashboard reading that data. Full sequencing in the approved plan.

## Database direct connection

Supabase project region: **ap-northeast-1** (Tokyo/SE-Asia pooler). If you ever need a
direct psql/pg connection (migrations, one-off scripts) instead of the JS client:

```
postgresql://postgres.jyklqvatxvhzmscqkoyk:[DB-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

DB password is in `.env.local` on Jonas's machine / 1Password, not committed here.
