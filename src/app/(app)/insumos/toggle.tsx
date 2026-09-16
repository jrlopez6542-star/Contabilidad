"use client";

import { toggleSupplyActiveAction } from "@/actions/supplies";

export function ToggleSupplyButton({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => toggleSupplyActiveAction(id, !active)}
      className="text-xs font-medium text-slate-500 hover:underline dark:text-brand-200"
    >
      {active ? "Desactivar" : "Activar"}
    </button>
  );
}
