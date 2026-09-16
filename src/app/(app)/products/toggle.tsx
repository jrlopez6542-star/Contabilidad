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
      className="text-xs font-medium text-slate-500 hover:text-brand"
    >
      {active ? "Desactivar" : "Activar"}
    </button>
  );
}
