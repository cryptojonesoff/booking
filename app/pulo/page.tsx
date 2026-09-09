import Link from "next/link";

export default function PuloPage() {
  return (
    <main style={{ padding: 40, fontFamily: "system-ui", maxWidth: 480, margin: "0 auto" }}>
      <h1>PULO 001</h1>
      <p style={{ color: "#666" }}>
        Placeholder — real sales page (hero, programme, tier cards) pending the
        Guest-Facing Sales Deck content and PULO visual identity.
      </p>
      <Link href="/pulo/checkout">Get tickets →</Link>
    </main>
  );
}
