import Link from "next/link";
import { getOrderDetail } from "@/lib/admin/data";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderDetail(id);

  if (!order) {
    return <p>Order not found.</p>;
  }

  const product = Array.isArray(order.products) ? order.products[0] : order.products;
  const tier = Array.isArray(order.ticket_tiers) ? order.ticket_tiers[0] : order.ticket_tiers;
  const voucher = Array.isArray(order.vouchers) ? order.vouchers[0] : order.vouchers;

  return (
    <div style={{ maxWidth: 560 }}>
      <Link href="/admin/orders">← Back to orders</Link>
      <h1 style={{ fontSize: 20, marginTop: 12 }}>Order detail</h1>

      <dl style={dl}>
        <Row label="Buyer">{order.buyer_name}</Row>
        <Row label="Email">{order.buyer_email}</Row>
        <Row label="Product">{product?.name ?? "—"}</Row>
        <Row label="Tier">{tier?.name ?? "—"}</Row>
        <Row label="Quantity">{order.quantity}</Row>
        <Row label="Amount">
          {(order.amount_total_cents / 100).toFixed(2)} {order.currency.toUpperCase()}
        </Row>
        <Row label="CIF contribution">
          {(order.cif_contribution_cents / 100).toFixed(2)} {order.currency.toUpperCase()}
        </Row>
        <Row label="Status">{order.status}</Row>
        <Row label="Date">{new Date(order.created_at).toLocaleString()}</Row>
        <Row label="Stripe session">
          <code style={{ fontSize: 12 }}>{order.stripe_session_id ?? "—"}</code>
        </Row>
        <Row label="Stripe payment intent">
          <code style={{ fontSize: 12 }}>{order.stripe_payment_intent_id ?? "—"}</code>
        </Row>
      </dl>

      <h2 style={{ fontSize: 15, color: "#666", marginTop: 24 }}>Ticket</h2>
      {voucher ? (
        <dl style={dl}>
          <Row label="Ticket code">
            <strong>{voucher.code}</strong>
          </Row>
          <Row label="Redeemed">{voucher.redeemed ? "Yes" : "No"}</Row>
          {voucher.redeemed_at && (
            <Row label="Redeemed at">{new Date(voucher.redeemed_at).toLocaleString()}</Row>
          )}
        </dl>
      ) : (
        <p style={{ color: "#999" }}>No ticket generated yet (order not paid).</p>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", padding: "6px 0", borderBottom: "1px solid #eee" }}>
      <dt style={{ width: 180, color: "#666", fontSize: 13 }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 14 }}>{children}</dd>
    </div>
  );
}

const dl: React.CSSProperties = { margin: 0 };
