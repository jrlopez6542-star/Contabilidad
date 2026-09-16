"use client";

import { useState } from "react";
import {
  convertQuoteToInvoiceAction,
  deleteQuoteAction,
  setQuoteStatusAction,
} from "@/actions/quotes";
import { Button } from "@/components/ui";

export function QuoteActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function setStatus(s: string) {
    setPending(true);
    setError(null);
    const res = await setQuoteStatusAction(id, s);
    if (res?.error) setError(res.error);
    setPending(false);
  }

  async function convert() {
    setPending(true);
    setError(null);
    const res = await convertQuoteToInvoiceAction(id);
    if (res?.error) {
      setError(res.error);
      setPending(false);
    }
  }

  async function remove() {
    if (!confirm("¿Eliminar esta cotización?")) return;
    setPending(true);
    setError(null);
    const res = await deleteQuoteAction(id);
    if (res?.error) {
      setError(res.error);
      setPending(false);
    }
  }

  if (status === "converted") return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "draft" && (
          <Button disabled={pending} onClick={() => setStatus("sent")}>
            Marcar enviada
          </Button>
        )}
        {["draft", "sent"].includes(status) && (
          <Button
            disabled={pending}
            variant="secondary"
            onClick={() => setStatus("accepted")}
          >
            Aceptada
          </Button>
        )}
        {["draft", "sent", "accepted"].includes(status) && (
          <Button disabled={pending} onClick={convert}>
            Convertir a factura
          </Button>
        )}
        {status !== "rejected" && (
          <Button
            disabled={pending}
            variant="ghost"
            onClick={() => setStatus("rejected")}
          >
            Rechazar
          </Button>
        )}
        {status !== "accepted" && (
          <Button disabled={pending} variant="danger" onClick={remove}>
            Eliminar
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-jam">{error}</p>}
    </div>
  );
}
