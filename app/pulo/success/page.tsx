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
          .select("status, buyer_name, quantity, vouchers(code)")
          .eq("stripe_session_id", session_id)
          .single()
      ).data
    : null;

  const voucher = order?.vouchers
    ? Array.isArray(order.vouchers)
      ? order.vouchers[0]
      : order.vouchers
    : null;

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
          {voucher && (
            <p>
              Ticket code: <strong>{voucher.code}</strong>
            </p>
          )}
        </>
      )}
    </main>
  );
}
