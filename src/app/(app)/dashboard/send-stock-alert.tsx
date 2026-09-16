"use client";

import { useState } from "react";
import { sendLowStockAlertNowAction } from "@/actions/stock-alerts";
import { Button } from "@/components/ui";

export function SendStockAlertButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    setMsg(null);
    setError(null);
    setPending(true);
    try {
      const res = await sendLowStockAlertNowAction();
      if (res?.error) setError(res.error);
      else setMsg(`Alerta enviada (${res.count} producto(s)).`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-1">
      <Button
        type="button"
        variant="secondary"
        className="!min-h-9 !py-1.5 text-xs"
        onClick={onClick}
        disabled={pending}
      >
        {pending ? "Enviando…" : "Enviar alerta ahora"}
      </Button>
      {error && <p className="text-xs text-jam">{error}</p>}
      {msg && <p className="text-xs text-brand">{msg}</p>}
    </div>
  );
}
