"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteDraftInvoiceAction,
  issueInvoiceAction,
  voidInvoiceAction,
} from "@/actions/invoices";
import { Button, Select } from "@/components/ui";

export function InvoiceActions({
  id,
  status,
  number,
  initialPaymentMethod = "efectivo",
  saleMethods = [
    { value: "efectivo", label: "Efectivo" },
    { value: "transferencia", label: "Transferencia" },
  ],
}: {
  id: string;
  status: string;
  number?: string;
  initialPaymentMethod?: string;
  saleMethods?: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState(
    initialPaymentMethod || "efectivo"
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const label = number ? ` ${number}` : "";

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      <div className="flex flex-wrap items-center gap-2">
        {status === "draft" && (
          <>
            <Select
              label=""
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="!min-h-11 w-full sm:!min-h-9 sm:w-40"
            >
              {saleMethods.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              disabled={busy}
              className="w-full sm:w-auto"
              onClick={async () => {
                setBusy(true);
                setError(null);
                const res = await issueInvoiceAction(id, {
                  paymentMethod,
                  markPaid: true,
                });
                if (res?.error) setError(res.error);
                else router.refresh();
                setBusy(false);
              }}
            >
              Emitir y cobrar
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              className="w-full sm:w-auto"
              onClick={async () => {
                if (
                  !confirm(
                    `¿Eliminar el borrador${label} de forma permanente? Esta acción no se puede deshacer.`
                  )
                ) {
                  return;
                }
                setBusy(true);
                setError(null);
                try {
                  const res = await deleteDraftInvoiceAction(id);
                  if (res?.error) {
                    setError(res.error);
                    setBusy(false);
                  }
                } catch {
                  // redirect
                }
              }}
            >
              Eliminar borrador
            </Button>
          </>
        )}
        {(status === "issued" || status === "paid") && (
          <Button
            type="button"
            variant="danger"
            disabled={busy}
            className="w-full sm:w-auto"
            onClick={async () => {
              const extra =
                status === "paid"
                  ? " Se restaurará el stock y se eliminarán los pagos."
                  : " Se restaurará el stock descontado.";
              if (!confirm(`¿Anular esta factura${label}?${extra}`)) return;
              setBusy(true);
              setError(null);
              const res = await voidInvoiceAction(id);
              if (res?.error) setError(res.error);
              else router.refresh();
              setBusy(false);
            }}
          >
            Anular
          </Button>
        )}
      </div>
      {error && <span className="text-xs text-jam">{error}</span>}
    </div>
  );
}
