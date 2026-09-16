"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteDraftInvoiceAction,
  deleteVoidInvoiceAction,
  voidInvoiceAction,
} from "@/actions/invoices";
import { Button, LinkButton } from "@/components/ui";

export function InvoiceRowActions({
  id,
  status,
  number,
}: {
  id: string;
  status: string;
  number: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDeleteDraft() {
    if (
      !confirm(
        `¿Eliminar el borrador ${number} de forma permanente? Esta acción no se puede deshacer. Si era de las últimas del prefijo actual, el próximo número se ajustará.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await deleteDraftInvoiceAction(id);
      if (res?.error) setError(res.error);
    } catch {
      // redirect throws NEXT_REDIRECT
    }
    setBusy(false);
  }

  async function onDeleteVoid() {
    if (
      !confirm(
        `¿Eliminar permanentemente la factura anulada ${number}? Esta acción no se puede deshacer. Si era de las últimas del prefijo actual, el próximo número se ajustará.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await deleteVoidInvoiceAction(id);
      if (res?.error) setError(res.error);
    } catch {
      // redirect throws NEXT_REDIRECT
    }
    setBusy(false);
  }

  async function onVoid() {
    const paidNote =
      status === "paid"
        ? " Se restaurará el stock y se eliminarán los pagos asociados."
        : " Se restaurará el stock descontado.";
    if (!confirm(`¿Anular la factura ${number}?${paidNote}`)) return;
    setBusy(true);
    setError(null);
    const res = await voidInvoiceAction(id);
    if (res?.error) {
      setError(res.error);
      setBusy(false);
      return;
    }
    router.refresh();
    setBusy(false);
  }

  if (
    status !== "draft" &&
    status !== "void" &&
    status !== "issued" &&
    status !== "paid"
  ) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1.5">
        {status === "draft" && (
          <>
            <LinkButton
              href={`/invoices/${id}`}
              variant="secondary"
              className="!min-h-11 !px-2.5 !py-1.5 !text-xs sm:!min-h-9"
            >
              Editar
            </LinkButton>
            <Button
              type="button"
              variant="danger"
              className="!min-h-11 !px-2.5 !py-1.5 !text-xs sm:!min-h-9"
              disabled={busy}
              onClick={onDeleteDraft}
            >
              Eliminar
            </Button>
          </>
        )}
        {status === "void" && (
          <Button
            type="button"
            variant="danger"
            className="!min-h-11 !px-2.5 !py-1.5 !text-xs sm:!min-h-9"
            disabled={busy}
            onClick={onDeleteVoid}
          >
            Eliminar
          </Button>
        )}
        {(status === "issued" || status === "paid") && (
          <Button
            type="button"
            variant="danger"
            className="!min-h-11 !px-2.5 !py-1.5 !text-xs sm:!min-h-9"
            disabled={busy}
            onClick={onVoid}
          >
            Anular
          </Button>
        )}
      </div>
      {error && (
        <span className="max-w-[10rem] text-right text-[10px] text-jam">
          {error}
        </span>
      )}
    </div>
  );
}
