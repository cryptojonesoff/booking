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
    <main style={{ padding: 40, fontFamily: "system-ui", maxWidth: 480, margin: "0 auto" }}>
      <h1>Thank you{order?.buyer_name ? `, ${order.buyer_name}` : ""}!</h1>
      {!order && <p>We couldn&apos;t find that order — check your confirmation email.</p>}
      {order && order.status === "pending" && (
        <p>Payment received — your ticket is being generated, check your email shortly.</p>
      )}
      {order && order.status === "paid" && (
        <>
          <p>Your order is confirmed.</p>
          {tickets.length > 0 && (
            <ul>
              {tickets.map((t, i) => (
                <li key={i}>
                  Ticket code: <strong>{t.code}</strong>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
