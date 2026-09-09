import "server-only";
import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Excludes visually ambiguous chars (0/O, 1/I/L).
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** e.g. "PULO-XK4R9" */
export function generateTicketCode(prefix: string, length = 5): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${prefix.toUpperCase()}-${code}`;
}

/**
 * Creates one ticket per person for a paid order (order.quantity tickets),
 * each with its own code. Every ticket gets one ticket_redemptions row per
 * field activation its tier grants access to (1 for a standalone ticket,
 * several for a bundle), so each dinner can be checked in independently.
 *
 * Returns the created tickets, each annotated with the field activations it
 * covers (for the confirmation email).
 */
export async function createTicketsForOrder(
  supabase: SupabaseClient,
  params: { orderId: string; ticketTierId: string; quantity: number; codePrefix: string },
) {
  const { orderId, ticketTierId, quantity, codePrefix } = params;

  const { data: links, error: linksError } = await supabase
    .from("ticket_tier_activations")
    .select("field_activation_id, field_activations(name)")
    .eq("ticket_tier_id", ticketTierId);

  if (linksError) {
    throw new Error(`Could not load field activations for tier: ${linksError.message}`);
  }

  const activations = (links ?? []).map((l) => {
    const fa = Array.isArray(l.field_activations) ? l.field_activations[0] : l.field_activations;
    return { id: l.field_activation_id as string, name: fa?.name ?? "Field activation" };
  });

  const tickets: { code: string; activationNames: string[] }[] = [];

  for (let i = 0; i < quantity; i++) {
    const code = generateTicketCode(codePrefix);

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({ order_id: orderId, code })
      .select("id")
      .single();

    if (ticketError || !ticket) {
      throw new Error(`Ticket insert failed: ${ticketError?.message}`);
    }

    if (activations.length > 0) {
      const { error: redemptionsError } = await supabase.from("ticket_redemptions").insert(
        activations.map((a) => ({ ticket_id: ticket.id, field_activation_id: a.id })),
      );
      if (redemptionsError) {
        throw new Error(`Ticket redemption rows insert failed: ${redemptionsError.message}`);
      }
    }

    tickets.push({ code, activationNames: activations.map((a) => a.name) });
  }

  return tickets;
}
