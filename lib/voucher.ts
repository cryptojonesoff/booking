import { randomBytes } from "crypto";

// Excludes visually ambiguous chars (0/O, 1/I/L).
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** e.g. "PULO-XK4R9" */
export function generateVoucherCode(prefix: string, length = 5): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${prefix.toUpperCase()}-${code}`;
}
