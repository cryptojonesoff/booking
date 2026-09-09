import { createAdminClient } from "@/lib/supabase/admin";

export default async function PuloSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const supabase = createAdminClient();

  const order = session_id
    ? (
        await supabase
          .from("orders")
          .select("status, buyer_name, quantity, tickets(code)")
          .eq("stripe_session_id", session_id)
          .single()
      ).data
    : null;

  const tickets = order?.tickets ?? [];

  return (
    <main className="tt-pulo-content">
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "64px 24px 80px" }}>
        <p className="tt-pulo-eyebrow" style={{ marginBottom: 8 }}>
          Order confirmed
        </p>
        <h1 className="tt-pulo-h1" style={{ marginBottom: 24 }}>
          Thank you{order?.buyer_name ? `, ${order.buyer_name}` : ""}.
        </h1>

        <div className="tt-pulo-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!order && (
            <p style={{ color: "var(--text-tertiary)" }}>
              We couldn&apos;t find that order — check your confirmation email.
            </p>
          )}
          {order && order.status === "pending" && (
            <p style={{ color: "var(--text-tertiary)" }}>
              Payment received. Your ticket{order.quantity > 1 ? "s are" : " is"} being generated, check your email
              shortly.
            </p>
          )}
          {order && order.status === "paid" && (
            <>
              <p>Your place at PULO x Pulau is confirmed.</p>
              {tickets.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {tickets.map((t, i) => (
                    <div key={i}>
                      <div className="tt-pulo-label">Ticket {tickets.length > 1 ? i + 1 : ""}</div>
                      <span className="tt-pulo-code">{t.code}</span>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Keep these codes — you&apos;ll need them at the door.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
