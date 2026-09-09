import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="tt-admin-nav">
        <strong>TT Admin — PULO 001</strong>
        <Link href="/admin">Overview</Link>
        <Link href="/admin/orders">Orders</Link>
        <Link href="/admin/tiers">Tiers</Link>
        <div style={{ marginLeft: "auto" }}>
          <LogoutButton />
        </div>
      </nav>
      <div className="tt-admin-content">{children}</div>
    </>
  );
}
