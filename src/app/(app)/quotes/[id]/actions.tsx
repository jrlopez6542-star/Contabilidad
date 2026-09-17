"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
    try {
      const res = await convertQuoteToInvoiceAction(id);
      if (res?.error) {
        setError(res.error);
        setPending(false);
      }
    } catch {
      // convert may redirect (NEXT_REDIRECT)
    }
  }

  async function remove() {
    if (
      !confirm(
        "¿Eliminar esta cotización de forma permanente? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await deleteQuoteAction(id);
      if (res?.error) {
        setError(res.error);
        setPending(false);
        return;
      }
      router.push("/quotes");
      router.refresh();
    } catch {
      // leftover NEXT_REDIRECT if any
      router.push("/quotes");
    }
  }

  if (status === "converted") return null;

  const canDelete = ["draft", "sent", "accepted", "rejected"].includes(status);

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
        {canDelete && (
          <Button disabled={pending} variant="danger" onClick={remove}>
            Eliminar
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-jam">{error}</p>}
    </div>
  );
}
