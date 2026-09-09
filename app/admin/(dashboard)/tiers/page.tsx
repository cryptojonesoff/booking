import { getTiersWithPrices } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

export default async function AdminTiersPage() {
  const tiers = await getTiersWithPrices();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Tiers</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>
        Read-only for v1 — edit price/capacity directly in Supabase until an in-UI editor is built.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={th}>Tier</th>
            <th style={th}>Prices</th>
            <th style={th}>Sold / Capacity</th>
            <th style={th}>Active</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((t) => (
            <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={td}>{t.name}</td>
              <td style={td}>
                {t.ticket_tier_prices.length === 0
                  ? "—"
                  : t.ticket_tier_prices
                      .map((p) => `${(p.price_cents / 100).toFixed(2)} ${p.currency.toUpperCase()}`)
                      .join(" · ")}
              </td>
              <td style={td}>
                {t.sold_count} / {t.capacity ?? "∞"}
              </td>
              <td style={td}>{t.active ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { padding: "8px 12px" };
const td: React.CSSProperties = { padding: "8px 12px" };
