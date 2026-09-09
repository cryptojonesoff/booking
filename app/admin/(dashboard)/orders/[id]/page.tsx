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
  const tickets = order.tickets ?? [];

  return (
    <div style={{ maxWidth: 560 }}>
      <Link href="/admin/orders">← Back to orders</Link>
      <h1 className="tt-h1" style={{ marginTop: 12 }}>
        Order detail
      </h1>

      <dl style={{ margin: "16px 0" }}>
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
        <Row label="Status">
          <span className={`tt-badge tt-badge-${order.status}`}>{order.status}</span>
        </Row>
        <Row label="Date">{new Date(order.created_at).toLocaleString()}</Row>
        <Row label="Stripe session">
          <code style={{ fontSize: 12 }}>{order.stripe_session_id ?? "—"}</code>
        </Row>
        <Row label="Stripe payment intent">
          <code style={{ fontSize: 12 }}>{order.stripe_payment_intent_id ?? "—"}</code>
        </Row>
      </dl>

      <h2 className="tt-h2" style={{ marginTop: 24 }}>
        Tickets ({tickets.length})
      </h2>
      {tickets.length === 0 ? (
        <p className="tt-muted">No tickets generated yet (order not paid).</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {tickets.map((t) => (
            <div key={t.id} style={{ border: "1px solid var(--tt-border, #ddd)", borderRadius: 8, padding: 12 }}>
              <strong>{t.code}</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {(t.ticket_redemptions ?? []).map((r, i) => {
                  const fa = Array.isArray(r.field_activations) ? r.field_activations[0] : r.field_activations;
                  return (
                    <li key={i} style={{ fontSize: 13 }}>
                      {fa?.name ?? "Field activation"} —{" "}
                      {r.redeemed ? `redeemed ${new Date(r.redeemed_at!).toLocaleString()}` : "not redeemed"}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="tt-dl-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
