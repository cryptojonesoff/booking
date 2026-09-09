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
            <th>Prices</th>
            <th>Sold / Capacity</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
