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
      <h1 className="tt-h1">{product.name} — Overview</h1>

      <section>
        <h2 className="tt-h2">Revenue (paid orders)</h2>
        {currencies.length === 0 && <p className="tt-muted">No paid orders yet.</p>}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {currencies.map((c) => (
            <div key={c} className="tt-card">
              <div className="tt-card-label">{c.toUpperCase()}</div>
              <div className="tt-card-value">{formatMoney(revenueByCurrency[c].revenue, c)}</div>
              <div className="tt-card-sub">
                incl. {formatMoney(revenueByCurrency[c].cif, c)} CIF ({product.cif_percentage}%)
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="tt-h2">Orders pulse</h2>
        <div style={{ display: "flex", gap: 16 }}>
          <div className="tt-card">
            <div className="tt-card-label">Last 24h</div>
            <div className="tt-card-value">{ordersLast24h}</div>
          </div>
          <div className="tt-card">
            <div className="tt-card-label">Last 7 days</div>
            <div className="tt-card-value">{ordersLast7d}</div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="tt-h2">Tickets sold vs capacity</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
          {tiers.map((t) => {
            const pct = t.capacity ? Math.min(100, (t.sold_count / t.capacity) * 100) : 0;
            return (
              <div key={t.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span>{t.name}</span>
                  <span className="tt-muted">
                    {t.sold_count}/{t.capacity ?? "∞"}
                  </span>
                </div>
                <div className="tt-progress-track">
                  <div className="tt-progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
