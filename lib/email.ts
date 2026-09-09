import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendOrderConfirmationEmail(params: {
  to: string;
  buyerName: string;
  productName: string;
  tierName: string;
  quantity: number;
  voucherCode: string;
}) {
  if (!resend || !process.env.RESEND_FROM_EMAIL) {
    // Not wired up yet — RESEND_API_KEY / RESEND_FROM_EMAIL missing. Don't
    // fail the webhook over it; log and move on so the order still records.
    console.warn("[email] Resend not configured — skipping confirmation email for", params.to);
    return;
  }

  const { to, buyerName, productName, tierName, quantity, voucherCode } = params;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to,
    subject: `Your ${productName} ticket is confirmed`,
    text: [
      `Hi ${buyerName},`,
      ``,
      `Your order is confirmed:`,
      `${quantity}x ${tierName} — ${productName}`,
      ``,
      `Ticket code: ${voucherCode}`,
      `Keep this code — you'll need it to redeem your ticket.`,
    ].join("\n"),
  });
}
