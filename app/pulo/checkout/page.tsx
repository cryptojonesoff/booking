import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "./CheckoutForm";

export default async function PuloCheckoutPage() {
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, name")
    .eq("slug", "pulo-001")
    .single();

  if (!product) {
    return (
      <main style={{ padding: 40, fontFamily: "system-ui" }}>
        <p>PULO 001 isn&apos;t available right now.</p>
      </main>
    );
  }

  const { data: tiers } = await supabase
    .from("ticket_tiers")
    .select(
      "id, name, capacity, sold_count, sort_order, includes_gym, includes_accommodation, includes_airport_transfer, ticket_tier_prices(currency, price_cents), ticket_tier_activations(field_activations(name))",
    )
    .eq("product_id", product.id)
    .eq("active", true)
    .order("sort_order");

  return (
    <main style={{ padding: 40, fontFamily: "system-ui", maxWidth: 480, margin: "0 auto" }}>
      <h1>{product.name} — Checkout</h1>
      <p style={{ color: "#666", fontSize: 14 }}>
        Placeholder layout — real /pulo sales page + design pass comes once the
        Guest-Facing Sales Deck content is in.
      </p>
      <CheckoutForm productId={product.id} tiers={tiers ?? []} />
    </main>
  );
}
