import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/checkout";

// Used by booking's own /pulo/checkout form (fetch → JSON → client redirect).
// For a cross-origin form (e.g. the TT marketing site), use
// /api/start-checkout instead — that one redirects directly, no fetch/CORS
// needed.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { product_id, ticket_tier_id, currency, quantity, buyer_name, buyer_email } = body;

  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  const result = await createCheckoutSession({
    productId: product_id,
    ticketTierId: ticket_tier_id,
    currency,
    quantity,
    buyerName: buyer_name,
    buyerEmail: buyer_email,
    successUrl: `${origin}/pulo/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/pulo/cancel`,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ url: result.url });
}
