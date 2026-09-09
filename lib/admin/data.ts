import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin dashboard reads go through the service-role client, not the anon
// key — see the RLS note in supabase/schema.sql. These pages are already
// gated by Supabase Auth in lib/supabase/middleware.ts before they render.

export async function getOverview(productSlug = "pulo-001") {
  const supabase = createAdminClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, name, cif_percentage")
    .eq("slug", productSlug)
    .single();

  if (!product) {
    return null;
  }

  const { data: paidOrders } = await supabase
    .from("orders")
    .select("currency, amount_total_cents, cif_contribution_cents, created_at")
    .eq("product_id", product.id)
    .eq("status", "paid");

  const revenueByCurrency: Record<string, { revenue: number; cif: number }> = {};
  for (const o of paidOrders ?? []) {
    revenueByCurrency[o.currency] ??= { revenue: 0, cif: 0 };
    revenueByCurrency[o.currency].revenue += o.amount_total_cents;
    revenueByCurrency[o.currency].cif += o.cif_contribution_cents;
  }

  const now = Date.now();
  const last24h = (paidOrders ?? []).filter(
    (o) => now - new Date(o.created_at).getTime() < 24 * 60 * 60 * 1000,
  ).length;
  const last7d = (paidOrders ?? []).filter(
    (o) => now - new Date(o.created_at).getTime() < 7 * 24 * 60 * 60 * 1000,
  ).length;

  const { data: tiers } = await supabase
    .from("ticket_tiers")
    .select("id, name, capacity, sold_count, sort_order")
    .eq("product_id", product.id)
    .order("sort_order");

  return {
    product,
    revenueByCurrency,
    ordersLast24h: last24h,
    ordersLast7d: last7d,
    tiers: tiers ?? [],
  };
}

export type OrderFilters = { status?: string; tierId?: string };

export async function getOrders(filters: OrderFilters = {}) {
  const supabase = createAdminClient();

  let query = supabase
    .from("orders")
    .select(
      "id, buyer_name, buyer_email, quantity, currency, amount_total_cents, cif_contribution_cents, status, created_at, ticket_tiers(name)",
    )
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.tierId) query = query.eq("ticket_tier_id", filters.tierId);

  const { data } = await query;
  return data ?? [];
}

export async function getOrderDetail(id: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, buyer_name, buyer_email, quantity, currency, amount_total_cents, cif_contribution_cents, status, created_at, stripe_session_id, stripe_payment_intent_id, products(name), ticket_tiers(name), vouchers(code, redeemed, redeemed_at)",
    )
    .eq("id", id)
    .single();
  return data;
}

export async function getAllTiersForFilter() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("ticket_tiers").select("id, name").order("sort_order");
  return data ?? [];
}

export async function getTiersWithPrices(productSlug = "pulo-001") {
  const supabase = createAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("slug", productSlug)
    .single();
  if (!product) return [];

  const { data } = await supabase
    .from("ticket_tiers")
    .select("id, name, capacity, sold_count, active, sort_order, ticket_tier_prices(currency, price_cents)")
    .eq("product_id", product.id)
    .order("sort_order");
  return data ?? [];
}
