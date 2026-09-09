import Link from "next/link";
import { getOrders, getAllTiersForFilter } from "@/lib/admin/data";
import { CsvExportButton } from "./CsvExportButton";

function tierName(t: { name: string } | { name: string }[] | null) {
  if (!t) return "—";
  return Array.isArray(t) ? t[0]?.name ?? "—" : t.name;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tier?: string }>;
}) {
  const { status, tier } = await searchParams;
  const [orders, tiers] = await Promise.all([
    getOrders({ status, tierId: tier }),
    getAllTiersForFilter(),
  ]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 className="tt-h1">Orders</h1>
        <CsvExportButton orders={orders} />
      </div>

      <form style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <select name="status" defaultValue={status ?? ""} className="tt-select">
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <select name="tier" defaultValue={tier ?? ""} className="tt-select">
          <option value="">All tiers</option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button type="submit" className="tt-btn-secondary">
          Filter
        </button>
      </form>

      <table className="tt-table">
        <thead>
          <tr>
            <th>Buyer</th>
            <th>Tier</th>
            <th>Qty</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <Link href={`/admin/orders/${o.id}`} style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  {o.buyer_name}
                </Link>
                <div className="tt-muted" style={{ fontSize: 12 }}>
                  {o.buyer_email}
                </div>
              </td>
              <td>{tierName(o.ticket_tiers)}</td>
              <td>{o.quantity}</td>
              <td>
                {(o.amount_total_cents / 100).toFixed(2)} {o.currency.toUpperCase()}
              </td>
              <td>
                <span className={`tt-badge tt-badge-${o.status}`}>{o.status}</span>
              </td>
              <td className="tt-muted">{new Date(o.created_at).toLocaleString()}</td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={6} className="tt-muted">
                No orders match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
