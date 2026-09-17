import { redirect } from "next/navigation";

/** Cotizaciones UI removed. */
export default function NewQuoteRedirectPage() {
  redirect("/dashboard");
}
