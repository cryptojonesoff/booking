import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/checkout";

// Built for a plain cross-origin HTML <form method="post"> from another
// site (e.g. the TT marketing site's ticket picker) — a full top-level
// navigation, not a fetch/XHR, so no CORS setup is needed on either side.
// This route does the same work as /api/checkout but responds with a
// redirect (to Stripe on success, back to the caller's page on failure)
// instead of JSON, since a plain form has nothing to do with a JSON body.
//
// success_path/cancel_path are relative paths on TT_SITE_URL (not full
// URLs) — the caller never gets to point Stripe's redirect at an arbitrary
// origin, only at a path on the one configured marketing site.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid form submission" }, { status: 400 });
  }

  const get = (key: string) => {
    const v = form.get(key);
    return typeof v === "string" ? v : "";
  };

  const ttSiteUrl = process.env.TT_SITE_URL;
  if (!ttSiteUrl) {
    console.error("[start-checkout] TT_SITE_URL not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const successPath = get("success_path") || "/pulo/success";
  const cancelPath = get("cancel_path") || "/pulo/cancel";
  const cancelUrl = new URL(cancelPath, ttSiteUrl).toString();

  const result = await createCheckoutSession({
    productSlug: get("product_slug") || undefined,
    productId: get("product_id") || undefined,
    ticketTierId: get("ticket_tier_id"),
    currency: get("currency"),
    quantity: Number(get("quantity")),
    buyerName: get("buyer_name"),
    buyerEmail: get("buyer_email"),
    successUrl: `${new URL(successPath, ttSiteUrl).toString()}?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl,
  });

  if (!result.ok) {
    const errorUrl = new URL(cancelUrl);
    errorUrl.searchParams.set("error", result.error);
    return NextResponse.redirect(errorUrl, 303);
  }

  return NextResponse.redirect(result.url, 303);
}
