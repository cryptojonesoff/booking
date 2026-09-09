import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTicketsForOrder } from "@/lib/tickets";
import { sendOrderConfirmationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("[webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    // Not the event we care about for v1 — acknowledge and move on.
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const supabase = createAdminClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, status, quantity, ticket_tier_id, buyer_name, buyer_email, product_id, products(name, slug), ticket_tiers(name)",
    )
    .eq("stripe_session_id", session.id)
    .single();

  if (orderError || !order) {
    console.error("[webhook] order not found for session", session.id, orderError);
    // Ack anyway — retrying won't make the order appear, and Stripe will
    // keep retrying a non-2xx response indefinitely.
    return NextResponse.json({ received: true });
  }

  // Idempotency: Stripe may redeliver this event.
  if (order.status === "paid") {
    return NextResponse.json({ received: true });
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "paid",
      stripe_payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
    })
    .eq("id", order.id);

  if (updateError) {
    console.error("[webhook] failed to mark order paid", updateError);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }

  // Atomic (see increment_tier_sold_count in supabase/schema.sql) — a plain
  // read-then-write here could race a second webhook for the same tier.
  const { error: capacityError } = await supabase.rpc("increment_tier_sold_count", {
    tier_id: order.ticket_tier_id,
    by: order.quantity,
  });
  if (capacityError) {
    console.error("[webhook] failed to increment sold_count", capacityError);
  }

  // Shared capacity: increment every field activation this tier grants
  // access to (standalone tickets and bundles alike draw from the same
  // per-dinner pool — see increment_activation_sold_counts).
  const { data: activationLinks } = await supabase
    .from("ticket_tier_activations")
    .select("field_activation_id")
    .eq("ticket_tier_id", order.ticket_tier_id);
  const activationIds = (activationLinks ?? []).map((l) => l.field_activation_id);
  if (activationIds.length > 0) {
    const { error: activationCapacityError } = await supabase.rpc(
      "increment_activation_sold_counts",
      { activation_ids: activationIds, by: order.quantity },
    );
    if (activationCapacityError) {
      console.error("[webhook] failed to increment activation sold_count", activationCapacityError);
    }
  }

  const product = Array.isArray(order.products) ? order.products[0] : order.products;
  const tier = Array.isArray(order.ticket_tiers) ? order.ticket_tiers[0] : order.ticket_tiers;
  const codePrefix = product?.slug ? product.slug.split("-")[0] : "TT";

  let tickets: { code: string; activationNames: string[] }[] = [];
  try {
    tickets = await createTicketsForOrder(supabase, {
      orderId: order.id,
      ticketTierId: order.ticket_tier_id,
      quantity: order.quantity,
      codePrefix,
    });
  } catch (err) {
    console.error("[webhook] ticket generation failed", err);
  }

  await sendOrderConfirmationEmail({
    to: order.buyer_email,
    buyerName: order.buyer_name,
    productName: product?.name ?? "Table Talks",
    tierName: tier?.name ?? "Ticket",
    tickets,
  });

  return NextResponse.json({ received: true });
}
