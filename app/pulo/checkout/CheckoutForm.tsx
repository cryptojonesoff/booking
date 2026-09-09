"use client";

import { useMemo, useState } from "react";

type Tier = {
  id: string;
  name: string;
  capacity: number | null;
  sold_count: number;
  includes_gym: boolean;
  includes_accommodation: boolean;
  includes_airport_transfer: boolean;
  ticket_tier_prices: { currency: string; price_cents: number }[];
  ticket_tier_activations: { field_activations: { name: string } | { name: string }[] | null }[];
};

function tierIncludes(t: Tier) {
  const activations = t.ticket_tier_activations
    .map((l) => (Array.isArray(l.field_activations) ? l.field_activations[0] : l.field_activations))
    .filter((fa): fa is { name: string } => !!fa)
    .map((fa) => fa.name);
  const perks = [
    t.includes_gym && "Gym",
    t.includes_accommodation && "Accommodation",
    t.includes_airport_transfer && "Airport transfer",
  ].filter(Boolean) as string[];
  return [...activations, ...perks].join(" · ");
}

export function CheckoutForm({ productId, tiers }: { productId: string; tiers: Tier[] }) {
  const [tierId, setTierId] = useState(tiers[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTier = tiers.find((t) => t.id === tierId);
  const currencies = selectedTier?.ticket_tier_prices.map((p) => p.currency) ?? [];
  const [currency, setCurrency] = useState(currencies[0] ?? "usd");

  const price = useMemo(
    () => selectedTier?.ticket_tier_prices.find((p) => p.currency === currency),
    [selectedTier, currency],
  );

  const remaining =
    selectedTier?.capacity != null ? selectedTier.capacity - selectedTier.sold_count : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          ticket_tier_id: tierId,
          currency,
          quantity,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error — try again");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
      <label>
        Tier
        <select
          value={tierId}
          onChange={(e) => {
            setTierId(e.target.value);
            const t = tiers.find((x) => x.id === e.target.value);
            setCurrency(t?.ticket_tier_prices[0]?.currency ?? "usd");
          }}
          style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
        >
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Currency
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
        >
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c.toUpperCase()}
            </option>
          ))}
        </select>
      </label>

      {selectedTier && (
        <p style={{ fontSize: 13, color: "#666" }}>Includes: {tierIncludes(selectedTier)}</p>
      )}

      {price && (
        <p>
          Price: {(price.price_cents / 100).toFixed(2)} {price.currency.toUpperCase()}
          {remaining !== null && <span style={{ color: "#666" }}> — {remaining} remaining</span>}
        </p>
      )}

      <label>
        Quantity
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
        />
      </label>

      <label>
        Name
        <input
          type="text"
          required
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
        />
      </label>

      <label>
        Email
        <input
          type="email"
          required
          value={buyerEmail}
          onChange={(e) => setBuyerEmail(e.target.value)}
          style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
        />
      </label>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <button type="submit" disabled={submitting || !price} style={{ padding: 12, marginTop: 8 }}>
        {submitting ? "Redirecting to Stripe…" : "Continue to payment"}
      </button>
    </form>
  );
}
