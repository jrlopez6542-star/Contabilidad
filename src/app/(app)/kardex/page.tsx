import { redirect } from "next/navigation";

/** Kardex UI removed; product stock ledger remains in backend. */
export default function KardexRedirectPage() {
  redirect("/insumos");
}
