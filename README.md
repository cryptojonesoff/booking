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
3. Run `supabase/schema.sql` in the Supabase SQL editor (creates tables + seeds PULO 001 placeholder tiers).
4. `npm run dev`

## Data model notes (diverges from the original brief)

- **Multi-currency**: `ticket_tier_prices` holds one row per `(ticket_tier_id, currency)`. A tier only sells in the currencies it has a price row for. The buyer picks a currency before checkout.
- **CIF %**: lives on `products.cif_percentage` (numeric, default 5.00), not hardcoded — configurable per product/project.

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
