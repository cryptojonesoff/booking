import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "system-ui", minHeight: "100vh", background: "#fafafa" }}>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "12px 24px",
          borderBottom: "1px solid #e0e0e0",
          background: "#fff",
        }}
      >
        <strong>TT Admin — PULO 001</strong>
        <Link href="/admin">Overview</Link>
        <Link href="/admin/orders">Orders</Link>
        <Link href="/admin/tiers">Tiers</Link>
        <div style={{ marginLeft: "auto" }}>
          <LogoutButton />
        </div>
      </nav>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}
