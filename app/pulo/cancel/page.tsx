import Link from "next/link";

export default function PuloCancelPage() {
  return (
    <main style={{ padding: 40, fontFamily: "system-ui", maxWidth: 480, margin: "0 auto" }}>
      <h1>Checkout cancelled</h1>
      <p>No charge was made. You can try again anytime.</p>
      <Link href="/pulo/checkout">Back to checkout</Link>
    </main>
  );
}
