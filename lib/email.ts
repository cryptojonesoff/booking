import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendOrderConfirmationEmail(params: {
  to: string;
  buyerName: string;
  productName: string;
  tierName: string;
  tickets: { code: string; activationNames: string[] }[];
}) {
  if (!resend || !process.env.RESEND_FROM_EMAIL) {
    // Not wired up yet — RESEND_API_KEY / RESEND_FROM_EMAIL missing. Don't
    // fail the webhook over it; log and move on so the order still records.
    console.warn("[email] Resend not configured — skipping confirmation email for", params.to);
    return;
  }

  const { to, buyerName, productName, tierName, tickets } = params;

  const ticketLines = tickets.flatMap((t) => [
    `Ticket code: ${t.code}`,
    ...(t.activationNames.length > 0 ? [`  Covers: ${t.activationNames.join(", ")}`] : []),
  ]);

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to,
    subject: `Your ${productName} ticket${tickets.length > 1 ? "s are" : " is"} confirmed`,
    text: [
      `Hi ${buyerName},`,
      ``,
      `Your order is confirmed:`,
      `${tickets.length}x ${tierName} — ${productName}`,
      ``,
      `Each person needs their own ticket code — keep them, you'll need them at the door.`,
      ``,
      ...ticketLines,
    ].join("\n"),
  });
}
