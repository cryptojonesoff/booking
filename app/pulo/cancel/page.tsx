import Link from "next/link";

export default function PuloCancelPage() {
  return (
    <main className="tt-pulo-content">
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "64px 24px 80px" }}>
        <p className="tt-pulo-eyebrow" style={{ marginBottom: 8 }}>
          Checkout cancelled
        </p>
        <h1 className="tt-pulo-h1" style={{ marginBottom: 24 }}>
          No charge was made.
        </h1>
        <div className="tt-pulo-card">
          <p style={{ marginBottom: 16 }}>You can pick up where you left off any time.</p>
          <Link href="/pulo/checkout" className="tt-pulo-btn" style={{ display: "inline-flex" }}>
            Back to tickets
          </Link>
        </div>
      </div>
    </main>
  );
}
