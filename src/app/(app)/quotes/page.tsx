import { redirect } from "next/navigation";

/** Cotizaciones UI removed; Quote models/actions remain in backend. */
export default function QuotesRedirectPage() {
  redirect("/dashboard");
}
