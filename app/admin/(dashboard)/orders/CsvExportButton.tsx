"use client";

type Row = {
  id: string;
  buyer_name: string;
  buyer_email: string;
  quantity: number;
  currency: string;
  amount_total_cents: number;
  cif_contribution_cents: number;
  status: string;
  created_at: string;
  ticket_tiers: { name: string } | { name: string }[] | null;
};

function tierName(t: Row["ticket_tiers"]) {
  if (!t) return "";
  return Array.isArray(t) ? t[0]?.name ?? "" : t.name;
}

export function CsvExportButton({ orders }: { orders: Row[] }) {
  function handleExport() {
    const headers = ["Order ID", "Buyer", "Email", "Tier", "Qty", "Currency", "Amount", "CIF", "Status", "Date"];
    const rows = orders.map((o) => [
      o.id,
      o.buyer_name,
      o.buyer_email,
      tierName(o.ticket_tiers),
      o.quantity,
      o.currency.toUpperCase(),
      (o.amount_total_cents / 100).toFixed(2),
      (o.cif_contribution_cents / 100).toFixed(2),
      o.status,
      new Date(o.created_at).toISOString(),
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulo-001-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button onClick={handleExport} className="tt-btn">
      Export CSV
    </button>
  );
}
