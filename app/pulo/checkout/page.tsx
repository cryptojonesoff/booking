import { createClient } from "@/lib/supabase/server";
import { TicketPicker } from "./TicketPicker";

export default async function PuloCheckoutPage() {
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, name, cif_percentage")
    .eq("slug", "pulo-001")
    .single();

  if (!product) {
    return (
      <main className="tt-pulo-content">
        <p>PULO x Pulau isn&apos;t available right now.</p>
      </main>
    );
  }

  const { data: tiers } = await supabase
    .from("ticket_tiers")
    .select(
      "id, name, description, capacity, sold_count, sort_order, includes_gym, includes_accommodation, includes_airport_transfer, ticket_tier_prices(currency, price_cents), ticket_tier_activations(field_activations(name))",
    )
    .eq("product_id", product.id)
    .eq("active", true)
    .order("sort_order");

  return (
    <main className="tt-pulo-content">
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 24px 80px" }}>
        <p className="tt-pulo-eyebrow" style={{ marginBottom: 8 }}>
          31 October &ndash; 10 November 2026 &middot; Siargao
        </p>
        <h1 className="tt-pulo-h1" style={{ marginBottom: 32 }}>
          Choose your residency.
        </h1>
        <TicketPicker
          productId={product.id}
          cifPercentage={Number(product.cif_percentage)}
          tiers={tiers ?? []}
        />
      </div>
    </main>
  );
}
