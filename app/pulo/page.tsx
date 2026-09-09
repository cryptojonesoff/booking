import { redirect } from "next/navigation";

// The story lives on the TT marketing site (tt-seven-sigma.vercel.app/pulo.html).
// This app is the storefront — go straight to the cart.
export default function PuloPage() {
  redirect("/pulo/checkout");
}
