"use client";

import { useState } from "react";
import { closeCajaAction } from "@/actions/caja";
import { Button, Input, Textarea } from "@/components/ui";
import { formatCOP } from "@/lib/format";

export function CajaCloseForm({
  date,
  expectedCash,
}: {
  date: string;
  expectedCash: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setMsg(null);
    const counted = Number(formData.get("countedCash") || 0);
    if (
      !confirm(
        `¿Cerrar caja del ${date}?\nEfectivo esperado: ${formatCOP(expectedCash)}\nEfectivo contado: ${formatCOP(counted)}`
      )
    ) {
      return;
    }
    setPending(true);
    try {
      const res = await closeCajaAction(formData);
      if (res?.error) setError(res.error);
      else setMsg("Caja cerrada correctamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <input type="hidden" name="date" value={date} />
      <p className="text-xs text-slate-500">
        Efectivo esperado (sistema):{" "}
        <strong className="text-slate-800">{formatCOP(expectedCash)}</strong>
      </p>
      <Input
        label="Efectivo contado"
        name="countedCash"
        type="number"
        min={0}
        step={1}
        required
        defaultValue={Math.round(expectedCash)}
      />
      <Textarea label="Notas (opcional)" name="notes" rows={3} />
      {error && <p className="text-sm text-jam">{error}</p>}
      {msg && <p className="text-sm text-brand">{msg}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Cerrando…" : "Cerrar caja"}
      </Button>
    </form>
  );
}
