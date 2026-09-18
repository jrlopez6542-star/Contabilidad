import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";

/** Alta de producto vive en el Panel (desplegable). */
export default async function NuevoProductoRedirectPage() {
  await requirePermission("products:write");
  redirect("/dashboard");
}
