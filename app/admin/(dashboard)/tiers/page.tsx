import { getTiersWithPrices } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

export default async function AdminTiersPage() {
  const tiers = await getTiersWithPrices();

  return (
    <div>
      <h1 className="tt-h1">Tiers</h1>
      <p className="tt-muted" style={{ marginBottom: 20 }}>
        Read-only for v1 — edit price/capacity directly in Supabase until an in-UI editor is built.
      </p>

      <table className="tt-table">
        <thead>
          <tr>
            <th>Tier</th>
            <th>Field activations</th>
            <th>Includes</th>
            <th>Prices</th>
            <th>Sold / SKU capacity</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((t) => {
            const perks = [
              t.includes_gym && "Gym",
              t.includes_accommodation && "Accommodation",
              t.includes_airport_transfer && "Airport transfer",
            ].filter(Boolean);
            return (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>
                  {t.ticket_tier_activations.length === 0
                    ? "—"
                    : t.ticket_tier_activations
                        .map((l) => {
                          const fa = Array.isArray(l.field_activations)
                            ? l.field_activations[0]
                            : l.field_activations;
                          return fa?.name ?? "—";
                        })
                        .join(", ")}
                </td>
                <td>{perks.length === 0 ? "—" : perks.join(", ")}</td>
                <td>
                  {t.ticket_tier_prices.length === 0
                    ? "—"
                    : t.ticket_tier_prices
                        .map((p) => `${(p.price_cents / 100).toFixed(2)} ${p.currency.toUpperCase()}`)
                        .join(" · ")}
                </td>
                <td>
                  {t.sold_count} / {t.capacity ?? "∞"}
                </td>
                <td>{t.active ? "Yes" : "No"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="tt-muted" style={{ marginTop: 20, fontSize: 13 }}>
        "Sold / SKU capacity" is per-tier sales, not the actual seat limit for a dinner — see the
        overview page's "Field activation seats" for the shared capacity that standalone tickets
        and bundles both draw from.
      </p>
    </div>
  );
}
