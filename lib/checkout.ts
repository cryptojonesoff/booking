import "server-only";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateCheckoutParams = {
  productSlug?: string;
  productId?: string;
  ticketTierId: string;
  currency: string;
  quantity: number;
  buyerName: string;
  buyerEmail: string;
  successUrl: string;
  cancelUrl: string;
};

export type CreateCheckoutResult =
  | { ok: true; url: string }
  | { ok: false, status: number; error: string };

/**
 * Shared checkout-session creation, used by both /api/checkout (JSON, used by
 * booking's own /pulo/checkout form) and /api/start-checkout (redirect, used
 * by a plain HTML form on another site — e.g. the TT marketing site — that
 * can't/shouldn't call this cross-origin via fetch).
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams,
): Promise<CreateCheckoutResult> {
  const {
    productSlug,
    productId,
    ticketTierId,
    currency,
    quantity,
    buyerName,
    buyerEmail,
    successUrl,
    cancelUrl,
  } = params;

  if ((!productId && !productSlug) || !ticketTierId || !currency || !buyerName || !buyerEmail) {
    return { ok: false, status: 400, error: "Missing required fields" };
  }
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    return { ok: false, status: 400, error: "Invalid quantity" };
  }

  const supabase = createAdminClient();

  const productQuery = supabase.from("products").select("id, name, status, cif_percentage");
  const { data: product, error: productError } = await (
    productId ? productQuery.eq("id", productId) : productQuery.eq("slug", productSlug!)
  ).single();

  if (productError || !product) {
    return { ok: false, status: 404, error: "Product not found" };
  }

  const { data: tier, error: tierError } = await supabase
    .from("ticket_tiers")
    .select("id, name, capacity, sold_count, active")
    .eq("id", ticketTierId)
    .eq("product_id", product.id)
    .single();

  if (tierError || !tier || !tier.active) {
    return { ok: false, status: 404, error: "Ticket tier not found" };
  }

  if (tier.capacity !== null && tier.sold_count + qty > tier.capacity) {
    return { ok: false, status: 400, error: "Not enough capacity remaining" };
  }

  // Shared capacity: a tier can grant access to several field activations
  // (bundles), and each activation's seats are shared with every other tier
  // that also grants access to it (standalone tickets included). Every
  // linked activation must have room for `qty` more.
  const { data: links, error: linksError } = await supabase
    .from("ticket_tier_activations")
    .select("field_activation_id, field_activations(name, capacity, sold_count)")
    .eq("ticket_tier_id", ticketTierId);

  if (linksError) {
    console.error("[checkout] failed to load field activations", linksError);
    return { ok: false, status: 500, error: "Could not verify availability" };
  }

  for (const link of links ?? []) {
    const fa = Array.isArray(link.field_activations) ? link.field_activations[0] : link.field_activations;
    if (fa && fa.capacity !== null && fa.sold_count + qty > fa.capacity) {
      return { ok: false, status: 400, error: `Not enough capacity remaining for ${fa.name}` };
    }
  }

  const { data: priceRow, error: priceError } = await supabase
    .from("ticket_tier_prices")
    .select("price_cents, currency")
    .eq("ticket_tier_id", ticketTierId)
    .eq("currency", currency.toLowerCase())
    .single();

  if (priceError || !priceRow) {
    return { ok: false, status: 400, error: `No price set for this tier in ${currency}` };
  }

  const unitAmount = priceRow.price_cents;
  const ticketSubtotal = unitAmount * qty;
  const cifContribution = Math.round(ticketSubtotal * (Number(product.cif_percentage) / 100));
  const grandTotal = ticketSubtotal + cifContribution;

  // Pending order first — its id goes into Stripe metadata for traceability,
  // and the row exists even if the buyer abandons checkout.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      product_id: product.id,
      ticket_tier_id: ticketTierId,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      quantity: qty,
      currency: priceRow.currency,
      amount_total_cents: grandTotal,
      cif_contribution_cents: cifContribution,
      status: "pending",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("[checkout] order insert failed", orderError);
    return { ok: false, status: 500, error: "Could not create order" };
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: buyerEmail,
      line_items: [
        {
          price_data: {
            currency: priceRow.currency,
            unit_amount: unitAmount,
            product_data: { name: `${product.name} — ${tier.name}` },
          },
          quantity: qty,
        },
        ...(cifContribution > 0
          ? [
              {
                price_data: {
                  currency: priceRow.currency,
                  unit_amount: cifContribution,
                  product_data: { name: "Community Impact Fund contribution" },
                },
                quantity: 1,
              },
            ]
          : []),
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        order_id: order.id,
        product_id: product.id,
        ticket_tier_id: ticketTierId,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
      },
    });
  } catch (err) {
    console.error("[checkout] Stripe session creation failed", err);
    await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
    return { ok: false, status: 500, error: "Stripe session creation failed" };
  }

  await supabase.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);

  if (!session.url) {
    return { ok: false, status: 500, error: "Stripe session has no URL" };
  }
  return { ok: true, url: session.url };
}
