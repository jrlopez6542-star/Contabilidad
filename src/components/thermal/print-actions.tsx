"use client";

import { useEffect } from "react";

/** Screen controls + optional auto-print on load. Hidden via CSS when printing. */
export function ThermalPrintActions({
  backHref,
  autoPrint = true,
}: {
  backHref: string;
  autoPrint?: boolean;
}) {
  useEffect(() => {
    if (!autoPrint) return;
    const t = window.setTimeout(() => {
      window.print();
    }, 400);
    return () => window.clearTimeout(t);
  }, [autoPrint]);

  return (
    <div className="thermal-screen-actions">
      <button type="button" onClick={() => window.print()}>
        Imprimir
      </button>
      <a className="secondary" href={backHref}>
        Volver
      </a>
    </div>
  );
}
