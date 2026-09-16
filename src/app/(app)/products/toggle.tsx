"use client";

import { toggleProductAction } from "@/actions/products";

export function ToggleProductButton({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => toggleProductAction(id, !active)}
      className="text-xs font-medium text-slate-500 hover:text-emerald-700"
    >
      {active ? "Desactivar" : "Activar"}
    </button>
  );
}
