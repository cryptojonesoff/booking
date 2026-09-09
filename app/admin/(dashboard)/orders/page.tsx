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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 20 }}>Orders</h1>
        <CsvExportButton orders={orders} />
      </div>

      <form style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <select name="status" defaultValue={status ?? ""} style={{ padding: 6 }}>
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <select name="tier" defaultValue={tier ?? ""} style={{ padding: 6 }}>
          <option value="">All tiers</option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button type="submit" style={{ padding: "6px 12px" }}>
          Filter
        </button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={th}>Buyer</th>
            <th style={th}>Tier</th>
            <th style={th}>Qty</th>
            <th style={th}>Amount</th>
            <th style={th}>Status</th>
            <th style={th}>Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={td}>
                <Link href={`/admin/orders/${o.id}`}>{o.buyer_name}</Link>
                <div style={{ color: "#999", fontSize: 12 }}>{o.buyer_email}</div>
              </td>
              <td style={td}>{tierName(o.ticket_tiers)}</td>
              <td style={td}>{o.quantity}</td>
              <td style={td}>
                {(o.amount_total_cents / 100).toFixed(2)} {o.currency.toUpperCase()}
              </td>
              <td style={td}>
                <span style={statusBadge(o.status)}>{o.status}</span>
              </td>
              <td style={td}>{new Date(o.created_at).toLocaleString()}</td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td style={td} colSpan={6}>
                No orders match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { padding: "8px 12px" };
const td: React.CSSProperties = { padding: "8px 12px" };

function statusBadge(status: string): React.CSSProperties {
  const colors: Record<string, string> = {
    paid: "#2a7a2a",
    pending: "#a67c00",
    failed: "#a52a2a",
    refunded: "#666",
  };
  return { color: colors[status] ?? "#333", fontWeight: 600 };
}
