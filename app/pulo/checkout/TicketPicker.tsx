"use client";

import { useMemo, useState } from "react";

type Tier = {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  sold_count: number;
  includes_gym: boolean;
  includes_accommodation: boolean;
  includes_airport_transfer: boolean;
  ticket_tier_prices: { currency: string; price_cents: number }[];
  ticket_tier_activations: { field_activations: { name: string } | { name: string }[] | null }[];
};

function activationNames(t: Tier) {
  return t.ticket_tier_activations
    .map((l) => (Array.isArray(l.field_activations) ? l.field_activations[0] : l.field_activations))
    .filter((fa): fa is { name: string } => !!fa)
    .map((fa) => fa.name.replace(/ — Days? \d.*$/, "").replace(/^Pulau Exclusive Chef's Table$/, "Chef's Table"));
}

function perks(t: Tier) {
  return [
    t.includes_gym && "Gym",
    t.includes_accommodation && "Accommodation",
    t.includes_airport_transfer && "Airport transfer",
  ].filter(Boolean) as string[];
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export function TicketPicker({
  productId,
  tiers,
  cifPercentage,
}: {
  productId: string;
  cifPercentage: number;
  tiers: Tier[];
}) {
  const standalone = tiers.filter((t) => !t.includes_gym);
  const passes = tiers.filter((t) => t.includes_gym);

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

  const remaining = selectedTier?.capacity != null ? selectedTier.capacity - selectedTier.sold_count : null;
  const soldOut = remaining !== null && remaining <= 0;

  const subtotal = price ? price.price_cents * quantity : 0;
  const cif = Math.round(subtotal * (cifPercentage / 100));
  const total = subtotal + cif;

  function selectTier(t: Tier) {
    setTierId(t.id);
    setQuantity(1);
    setCurrency(t.ticket_tier_prices[0]?.currency ?? "usd");
    setError(null);
  }

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
    <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr", gap: 40 }} className="tt-pulo-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <TierGroup
          label="A single field activation"
          hint="One dinner, your choice of the four."
          items={standalone}
          selectedId={tierId}
          onSelect={selectTier}
          currency={currency}
        />
        <TierGroup
          label="Passes"
          hint="Several field activations, with or without accommodation and airport transfer. Every pass includes gym access."
          items={passes}
          selectedId={tierId}
          onSelect={selectTier}
          currency={currency}
        />
      </div>

      <div>
        <div className="tt-pulo-card" style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div className="tt-pulo-label">Selected</div>
            <p style={{ fontWeight: 700 }}>{selectedTier?.name ?? "—"}</p>
          </div>

          <div>
            <label className="tt-pulo-label" htmlFor="currency">
              Currency
            </label>
            <select
              id="currency"
              className="tt-pulo-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="tt-pulo-label">Quantity</div>
            <div className="tt-pulo-stepper">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}>
                &minus;
              </button>
              <span style={{ minWidth: 20, textAlign: "center" }}>{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => (remaining != null ? Math.min(remaining, q + 1) : q + 1))}
                disabled={remaining != null && quantity >= remaining}
              >
                +
              </button>
            </div>
            {remaining !== null && (
              <p className="tt-pulo-pill" style={{ marginTop: 8 }}>
                {soldOut ? "Sold out" : `${remaining} seats left`}
              </p>
            )}
          </div>

          <div className="tt-pulo-divider" />

          {price ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              <Row label={`${quantity} × ${selectedTier?.name}`} value={formatMoney(subtotal, currency)} />
              <Row
                label={`Community Impact Fund (${cifPercentage}%)`}
                value={formatMoney(cif, currency)}
                muted
              />
              <div className="tt-pulo-divider" style={{ margin: "4px 0" }} />
              <Row label="Total" value={formatMoney(total, currency)} bold />
            </div>
          ) : (
            <p className="tt-pulo-label">No price set in this currency yet.</p>
          )}

          <div className="tt-pulo-divider" />

          <div>
            <label className="tt-pulo-label" htmlFor="buyer_name">
              Name
            </label>
            <input
              id="buyer_name"
              className="tt-pulo-input"
              required
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />
          </div>
          <div>
            <label className="tt-pulo-label" htmlFor="buyer_email">
              Email
            </label>
            <input
              id="buyer_email"
              type="email"
              className="tt-pulo-input"
              required
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
            />
          </div>

          {error && <p style={{ color: "#A84050", fontSize: 12 }}>{error}</p>}

          <button type="submit" className="tt-pulo-btn" disabled={submitting || !price || soldOut}>
            {submitting ? "Redirecting to payment…" : soldOut ? "Sold out" : "Continue to payment"}
          </button>
        </div>
      </div>
    </form>
  );
}

function TierGroup({
  label,
  hint,
  items,
  selectedId,
  onSelect,
  currency,
}: {
  label: string;
  hint: string;
  items: Tier[];
  selectedId: string;
  onSelect: (t: Tier) => void;
  currency: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{label}</h2>
      <p className="tt-pulo-label" style={{ marginBottom: 14 }}>
        {hint}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((t) => {
          const price = t.ticket_tier_prices.find((p) => p.currency === currency) ?? t.ticket_tier_prices[0];
          const remaining = t.capacity != null ? t.capacity - t.sold_count : null;
          const soldOut = remaining !== null && remaining <= 0;
          return (
            <label
              key={t.id}
              className={`tt-pulo-tier${selectedId === t.id ? " is-selected" : ""}`}
              style={{ position: "relative", opacity: soldOut ? 0.5 : 1 }}
            >
              <input
                type="radio"
                name="tier"
                checked={selectedId === t.id}
                disabled={soldOut}
                onChange={() => onSelect(t)}
              />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>{t.name}</p>
                  {t.description && (
                    <p style={{ fontSize: 12.5, color: "var(--text-tertiary)", marginBottom: 8 }}>{t.description}</p>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {[...activationNames(t), ...perks(t)].map((label) => (
                      <span key={label} className="tt-pulo-pill">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {price && <p style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{formatMoney(price.price_cents, price.currency)}</p>}
                  {soldOut && <p className="tt-pulo-label">Sold out</p>}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: muted ? "var(--text-tertiary)" : undefined, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ color: muted ? "var(--text-tertiary)" : undefined, fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
}
