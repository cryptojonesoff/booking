import { Arimo } from "next/font/google";
import "./theme.css";

const arimo = Arimo({ subsets: ["latin"], variable: "--font-arimo" });

// PULO x Pulau storefront — same DA as tabletalksaustralia.com.au (Arimo,
// cream/wine-red palette, 10px+ radius). Scoped via theme.css's .tt-pulo so
// /admin (its own theme) is unaffected.
export default function PuloLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${arimo.variable} tt-pulo`} style={{ fontFamily: "var(--font-arimo), Arial, sans-serif" }}>
      <header className="tt-pulo-header">
        <a href="https://tt-seven-sigma.vercel.app/pulo.html" className="tt-pulo-wordmark">
          TABLE TALKS <span>&times; PULO</span>
        </a>
        <a href="https://tt-seven-sigma.vercel.app/pulo.html" className="back">
          &larr; Back to the residency
        </a>
      </header>
      {children}
    </div>
  );
}
