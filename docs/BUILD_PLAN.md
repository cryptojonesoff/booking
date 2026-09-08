# TT Ticketing Platform (PULO 001) — Build Plan

## Context

The brief (`TT_Ticketing_Platform_v1_PULO_Brief.md`) specifies a standalone booking/ticketing app for PULO 001, meant to later generalize to other TT products and to Made by Many. Nothing exists yet — this is a greenfield build in a new repo (`tt-book`), separate from the main TT site repo.

Two clarifications from Jonas change the brief's schema:
- **Multi-currency from v1**: buyer picks their currency (USD/EUR/AUD, PHP to follow) at checkout — not a single fixed currency per product as the brief assumed.
- **CIF % must be configurable per project**, not hardcoded — different products may use different %.

The user's core question — "am I building the backend or the dashboard?" — is answered by sequencing: **the backend (schema → checkout → webhook) must exist and produce real order data before the admin dashboard is built**, since the dashboard is a read-only view over `orders`/`ticket_tiers`. Building it earlier means building it against nothing. This plan makes that split explicit as two build tracks with a hard dependency between them.

**Reference found in the workspace**: `TT/CIP Dashboard COO/` is an existing Next.js 16 + Supabase (`@supabase/ssr`) + Tailwind v4 admin app with a working auth pattern (`lib/supabase/{client,server,middleware,admin}.ts`, `app/(app)`, `app/login`, `app/forgot-password`, `app/update-password`). Reuse this pattern directly for `tt-book`'s `/admin` auth instead of re-deriving Supabase SSR auth from scratch — it's already solved correctly in this workspace.

`docs/DA.md` (TT site DA) is wine-red/cream editorial — the brief notes PULO's own deck palette (near-black ink, paper cream, rust/terracotta, navy, olive) differs and should be used for `/pulo`, with DA.md's typographic *approach* (serif display + grotesque sans) as the structural precedent, not its literal palette.

## Schema changes vs. the brief

```sql
-- products: CIF % now lives here, per-product, not hardcoded in app logic
alter table products add column cif_percentage numeric(5,2) not null default 5.00;

-- ticket_tiers: drop price_cents/currency, move to a prices table
create table ticket_tier_prices (
  id uuid primary key default gen_random_uuid(),
  ticket_tier_id uuid references ticket_tiers(id) on delete cascade,
  currency text not null,          -- 'usd' | 'eur' | 'aud' | 'php'
  price_cents integer not null,
  unique (ticket_tier_id, currency)
);
-- ticket_tiers keeps: capacity, sold_count, sort_order, active (price_cents/currency columns removed)

-- orders: record which currency was actually paid
alter table orders add column currency text not null default 'usd';
```

Checkout flow adjustment: buyer selects currency first (toggle/dropdown on `/pulo` or at the top of `/pulo/checkout`), tier prices displayed update from `ticket_tier_prices`. `POST /api/checkout` receives `{ product_id, ticket_tier_id, currency, quantity }`, looks up the matching `ticket_tier_prices` row (404/reject if that tier has no price in that currency), computes `cif_contribution_cents` from `products.cif_percentage`, creates the Stripe Checkout Session in that currency.

## Build tracks

### Track A — Backend (repo, schema, checkout, webhook) — build first
1. Create the `tt-book` repo (Next.js App Router, TypeScript, Tailwind), connect Supabase project, run the schema above. New Vercel project from repo root.
2. `/pulo` static sales page — port PULO deck content, PULO palette, no payment logic yet.
3. `/api/checkout` — Stripe Checkout Session creation against `ticket_tier_prices`, capacity check, pending `orders` row.
4. `/api/webhooks/stripe` — verify signature, mark order `paid`, increment `sold_count`, generate `vouchers` row, trigger email.
5. `/pulo/success`, `/pulo/cancel` pages; Resend confirmation email (voucher code, tier, product).
6. Swap placeholder tiers/prices for Jonas's real pricing once provided (still open per brief §10).

At the end of Track A, `orders`/`vouchers` tables have real rows from real (test-mode) checkouts — this is the "populated data" the dashboard needs.

### Track B — Admin dashboard — build after Track A step 4 is verified
1. Port the Supabase SSR auth pattern from `CIP Dashboard COO` (`lib/supabase/*`, `middleware.ts`, `/admin/login`) — single admin account, no roles.
2. `/admin` overview — revenue, CIF collected (sum via `products.cif_percentage` per order, already stored on `orders.cif_contribution_cents`), per-tier sold/capacity bars, 24h/7d order pulse.
3. `/admin/orders` — table + status/tier filters, order detail (voucher/redemption), CSV export.
4. `/admin/tiers` — read-only capacity view.

Plain/fast internal styling, not the PULO brand system — per brief §8.

### Track C — Deploy
Test-mode Stripe end-to-end on Vercel preview → swap to live keys → link from the main TT site (`site/`) as a URL, no code coupling.

## Verification
- Track A: run a full test-mode Stripe Checkout (test card) end-to-end locally against the webhook (Stripe CLI `stripe listen --forward-to localhost:3000/api/webhooks/stripe`); confirm `orders` row flips to `paid`, `sold_count` increments, a `vouchers` row appears, and the confirmation email sends via Resend.
- Track B: after step 1 above, confirm `/admin` redirects to `/admin/login` unauthenticated, and that the overview numbers match the test orders created in Track A's verification.
- Both: `npm run build` clean on Vercel before flipping Stripe to live keys.

## Still open (flag to Jonas, don't guess — per brief §10)
- Exact ticket tiers/pricing per currency (Guest-Facing Sales Deck + Pricing Guidelines 2026) — placeholders from brief §7 used in USD until provided.
- Whether PHP needs to be live at launch or can follow shortly after USD/EUR/AUD.
