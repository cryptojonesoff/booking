import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { product_id, ticket_tier_id, currency, quantity, buyer_name, buyer_email } = body;

  if (!product_id || !ticket_tier_id || !currency || !buyer_name || !buyer_email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, status, cif_percentage")
    .eq("id", product_id)
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const { data: tier, error: tierError } = await supabase
    .from("ticket_tiers")
    .select("id, name, capacity, sold_count, active")
    .eq("id", ticket_tier_id)
    .eq("product_id", product_id)
    .single();

  if (tierError || !tier || !tier.active) {
    return NextResponse.json({ error: "Ticket tier not found" }, { status: 404 });
  }

  if (tier.capacity !== null && tier.sold_count + qty > tier.capacity) {
    return NextResponse.json({ error: "Not enough capacity remaining" }, { status: 400 });
  }

  const { data: priceRow, error: priceError } = await supabase
    .from("ticket_tier_prices")
    .select("price_cents, currency")
    .eq("ticket_tier_id", ticket_tier_id)
    .eq("currency", String(currency).toLowerCase())
    .single();

  if (priceError || !priceRow) {
    return NextResponse.json(
      { error: `No price set for this tier in ${currency}` },
      { status: 400 },
    );
  }

  const unitAmount = priceRow.price_cents;
  const ticketSubtotal = unitAmount * qty;
  const cifContribution = Math.round(
    ticketSubtotal * (Number(product.cif_percentage) / 100),
  );
  const grandTotal = ticketSubtotal + cifContribution;

  // Pending order first — its id goes into Stripe metadata for traceability,
  // and the row exists even if the buyer abandons checkout.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      product_id,
      ticket_tier_id,
      buyer_name,
      buyer_email,
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
    return NextResponse.json({ error: "Could not create order" }, { status: 500 });
  }

  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: buyer_email,
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
                  product_data: {
                    name: "Community Impact Fund contribution",
                  },
                },
                quantity: 1,
              },
            ]
          : []),
      ],
      success_url: `${origin}/pulo/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pulo/cancel`,
      metadata: {
        order_id: order.id,
        product_id,
        ticket_tier_id,
        buyer_name,
        buyer_email,
      },
    });
  } catch (err) {
    console.error("[checkout] Stripe session creation failed", err);
    await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
    return NextResponse.json({ error: "Stripe session creation failed" }, { status: 500 });
  }

  await supabase
    .from("orders")
    .update({ stripe_session_id: session.id })
    .eq("id", order.id);

  return NextResponse.json({ url: session.url });
}
