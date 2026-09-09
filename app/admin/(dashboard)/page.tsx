import { getOverview } from "@/lib/admin/data";

// Reads live order/tier data via the service-role client (no cookies used,
// so Next has no signal to skip static prerendering on its own).
export const dynamic = "force-dynamic";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100,
  );
}

export default async function AdminOverviewPage() {
  const overview = await getOverview();

  if (!overview) {
    return <p>PULO 001 not found.</p>;
  }

  const { product, revenueByCurrency, ordersLast24h, ordersLast7d, tiers } = overview;
  const currencies = Object.keys(revenueByCurrency);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <h1 style={{ fontSize: 20 }}>{product.name} — Overview</h1>

      <section>
        <h2 style={{ fontSize: 15, color: "#666" }}>Revenue (paid orders)</h2>
        {currencies.length === 0 && <p style={{ color: "#999" }}>No paid orders yet.</p>}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {currencies.map((c) => (
            <div key={c} style={card}>
              <div style={{ fontSize: 12, color: "#999" }}>{c.toUpperCase()}</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>
                {formatMoney(revenueByCurrency[c].revenue, c)}
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>
                incl. {formatMoney(revenueByCurrency[c].cif, c)} CIF ({product.cif_percentage}%)
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 15, color: "#666" }}>Orders pulse</h2>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 12, color: "#999" }}>Last 24h</div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{ordersLast24h}</div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 12, color: "#999" }}>Last 7 days</div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{ordersLast7d}</div>
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 15, color: "#666" }}>Tickets sold vs capacity</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
          {tiers.map((t) => {
            const pct = t.capacity ? Math.min(100, (t.sold_count / t.capacity) * 100) : 0;
            return (
              <div key={t.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>{t.name}</span>
                  <span>
                    {t.sold_count}/{t.capacity ?? "∞"}
                  </span>
                </div>
                <div style={{ background: "#eee", height: 8, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ background: "#333", height: 8, width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e0e0e0",
  borderRadius: 8,
  padding: "12px 16px",
  minWidth: 140,
};
