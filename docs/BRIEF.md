# TT Ticketing Platform — v1 Build Brief
**Scope: PULO 001 (Siargao × Bali) only. No multi-tenant / Warden logic yet — architected to extend later, not implemented now.**

---

## 1. Context

Table Talks needs a real booking/ticketing funnel to sell PULO 001 (creative residency, Siargao × Bali, 31 Oct–10 Nov 2026, produced with Pulau Projects). This replaces the current state (no sales mechanism) and is the first piece of infrastructure that will later generalize to other TT products, and eventually to Made by Many.

Not in scope for v1: multi-tenant marketplace, Stripe Connect payouts to external brands (Warden etc.), voucher flexibility beyond a fixed ticket. Build the data model so those aren't painful to add later, but don't build them now.

**Repo:** a **new, standalone repo** (e.g. `tt-book` or similar — separate from `github.com/cryptojonesoff/TT`), not a subfolder of the existing site repo.

**Why separate, not a monorepo subfolder:** this platform is explicitly meant to evolve into the Made by Many booking infrastructure later — it isn't a permanent TT-only asset. Splitting it out now means:
- Ownership can transfer cleanly later (GitHub repo transfer) without extracting code from a shared history.
- Access can be scoped independently — a future Made by Many collaborator can get access to this repo without touching the rest of the TT codebase.
- No cost today: the booking site only needs to be *linked* from the TT site (a URL), not built from the same codebase — so there's no shared-infrastructure benefit lost by separating.

**Deployment:** its own Vercel project, deployed from the root of this new repo (no Root Directory subfolder needed, since the whole repo is this app).

---

## 2. Stack

- **Next.js** (App Router) — frontend + API routes
- **Supabase** — Postgres DB, no auth needed for guests (guest checkout only, no login required for v1)
- **Stripe Checkout** (hosted checkout page, not custom Elements — faster to ship, PCI scope stays with Stripe)
- **Resend or Supabase's built-in email** for confirmation emails (pick whichever is simpler to wire up; Resend is straightforward with Next.js)
- **Vercel** for hosting (consistent with existing TT infra)

---

## 3. Data model (Supabase / Postgres)

```sql
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,          -- 'pulo-001'
  name text not null,
  description text,
  start_date date,
  end_date date,
  location text,
  status text default 'draft',        -- draft | live | closed
  created_at timestamptz default now()
);

create table ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  name text not null,                 -- e.g. 'Full Residency Pass', 'Day Experience'
  description text,
  price_cents integer not null,
  currency text default 'php',        -- confirm currency with Jonas (PHP vs USD vs AUD)
  capacity integer,                   -- null = unlimited
  sold_count integer default 0,
  sort_order integer default 0,
  active boolean default true
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  ticket_tier_id uuid references ticket_tiers(id),
  buyer_name text not null,
  buyer_email text not null,
  quantity integer not null default 1,
  amount_total_cents integer not null,
  cif_contribution_cents integer not null default 0,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  status text default 'pending',      -- pending | paid | failed | refunded
  created_at timestamptz default now()
);

create table vouchers (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  code text unique not null,          -- short human-readable code, e.g. PULO-XK4R9
  type text default 'fixed_ticket',   -- 'fixed_ticket' now; 'credit' / 'flex_credit' reserved for later
  redeemed boolean default false,
  redeemed_at timestamptz,
  created_at timestamptz default now()
);
```

**CIF contribution:** hardcode a fixed % (confirm with Jonas — SFWF precedent used 5% buyer-funded, added on top of ticket price). Calculate `cif_contribution_cents` at checkout time and store it on the order for reporting. No actual fund transfer/split needed in v1 — the money stays in TT's Stripe account; the % is tracked for reporting/accountability, and reconciled manually until volume justifies automating a transfer.

---

## 4. Pages / routes

- `/pulo` — sales page (hero, about PULO, the residency programme, ticket tier cards) — content exists in the PULO guest-facing sales deck (PPTX) and the Pulo x Pulau Projects overview doc; port that content in, don't rewrite from scratch.
- `/pulo/checkout` — tier + quantity selector → calls API route to create a Stripe Checkout session → redirects to Stripe
- `/pulo/success` — post-payment confirmation page (Stripe redirects here with session_id)
- `/pulo/cancel` — if guest abandons checkout
- API routes:
  - `POST /api/checkout` — creates Stripe Checkout Session, passes `product_id`, `ticket_tier_id`, `quantity`
  - `POST /api/webhooks/stripe` — Stripe webhook, listens for `checkout.session.completed`, writes the `orders` row as `paid`, decrements tier capacity, generates a `vouchers` row, triggers confirmation email

---

## 5. Stripe flow (pseudocode)

```
// POST /api/checkout
1. Look up ticket_tier (price, remaining capacity)
2. If sold_count + quantity > capacity → reject
3. Create Stripe Checkout Session:
   - line_items: [{ price_data: { currency, unit_amount: price_cents, product_data: { name } }, quantity }]
   - success_url: /pulo/success?session_id={CHECKOUT_SESSION_ID}
   - cancel_url: /pulo/cancel
   - metadata: { product_id, ticket_tier_id, buyer_name, buyer_email }
4. Insert a `pending` row into orders with the stripe_session_id
5. Return session.url, redirect client to it

// POST /api/webhooks/stripe (event: checkout.session.completed)
1. Verify webhook signature
2. Find order by stripe_session_id
3. Update order status = 'paid', store payment_intent_id
4. Increment ticket_tiers.sold_count
5. Generate voucher (random short code)
6. Send confirmation email (buyer name, product, tier, voucher code)
```

---

## 6. Design

Reuse the PULO deck visual identity, already defined:
- Near-black ink, paper cream, rust/terracotta, navy, olive accents
- Cambria (serif, headings) / Calibri (sans, body) — or closest web-safe equivalents (Cambria may need a webfont fallback; check `docs/DA.md` in the repo for the canonical site DA if this differs)
- Concentric ellipse motif (island contour lines) — can reuse as a section divider or background element

Check `docs/DA.md` in the repo before styling anything — that's the canonical source for the site's visual system per Jonas's existing setup.

---

## 7. Placeholder ticket tiers (replace with real pricing when available)

Jonas has a "Guest-Facing Sales Deck" and "Pricing Guidelines 2026" with the actual formulas — not yet available in this session. Use these placeholders to scaffold, flag clearly as placeholder in code comments:

| Tier | Price (placeholder) | Capacity (placeholder) |
|---|---|---|
| Full Residency Pass | ₱15,000 | 20 |
| Day Experience | ₱2,500 | 40 |
| Chef's Table Dinner | ₱4,500 | 30 |

---

## 8. Admin dashboard

Jonas needs a simple, digestible interface to see what's happening — not a raw database view. Scope for v1: read-only tracking, no editing of orders/tiers from the UI yet (that still happens via Supabase directly or a follow-up phase).

**Auth:** Supabase Auth with a single admin account (email/password) is enough for v1 — no need for roles/permissions yet, it's just Jonas. Protect `/admin/*` routes with a simple middleware check (redirect to `/admin/login` if no session).

**Route:** `/admin` (same Next.js app, gated separately from the public `/pulo` pages).

**Pages/views:**

- `/admin` — overview
  - Total revenue (paid orders only)
  - Total CIF contribution collected
  - Tickets sold vs capacity, per tier (simple progress bars — e.g. "Full Residency Pass: 14/20 sold")
  - Orders in the last 24h / 7 days (quick pulse check)

- `/admin/orders` — order list
  - Table: buyer name, email, tier, quantity, amount, status (paid/pending/failed/refunded), date
  - Filter by status and by tier
  - Click into an order to see the linked voucher code and redemption status
  - CSV export button (Jonas will want this for reconciliation with Finance — matches the pattern already used for sponsor/vendor tracking elsewhere in the ecosystem)

- `/admin/tiers` — capacity management (read-only view for v1; editing tier price/capacity still done via Supabase directly, flag as a fast-follow if Jonas wants it in-UI)

**Design:** doesn't need to match the PULO public-facing brand system — this is an internal tool. Keep it plain, fast, and legible: a simple table/card layout is fine. Don't spend design effort here in v1.

**Build order note:** build this after the checkout + webhook flow is working (Step 4 below), since the dashboard just reads the `orders`/`ticket_tiers` tables that flow populates — no point building it against empty data.

---

## 9. Build order (do in this sequence)

1. Create a new standalone repo (e.g. `tt-book`), scaffold Next.js app, connect to Supabase, run the schema above. Set up its own Vercel project deployed from repo root.
2. Build `/pulo` static content page first (no payment yet) — get the sales page live and reviewable.
3. Wire Stripe Checkout Session creation (`/api/checkout`) with placeholder tiers — test with Stripe test mode.
4. Wire the webhook (`/api/webhooks/stripe`) — confirm order writes correctly on test payment.
5. Build `/pulo/success` and voucher generation + confirmation email.
6. Build the admin dashboard (`/admin`, `/admin/orders`) — see Section 8, now that there's real order data to read.
7. Swap placeholder tiers for real pricing once Jonas provides them.
8. Deploy to Vercel, connect real Stripe keys (test → live), link from main TT site.

---

## 10. Open questions for Jonas (flag, don't guess)

- Currency: PHP, USD, or AUD for PULO ticket pricing?
- CIF contribution %: confirm 5% (SFWF precedent) or different for PULO.
- Exact ticket tiers/pricing (Guest-Facing Sales Deck + Pricing Guidelines 2026).
- Email sender: does TT have a transactional email setup already, or start fresh with Resend?
