"use client";

import { issueInvoiceAction, voidInvoiceAction } from "@/actions/invoices";
import { Button } from "@/components/ui";

export function InvoiceActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  return (
    <div className="flex gap-2">
      {status === "draft" && (
        <Button
          type="button"
          onClick={async () => {
            await issueInvoiceAction(id);
          }}
        >
          Emitir
        </Button>
      )}
      {(status === "draft" || status === "issued") && (
        <Button
          type="button"
          variant="danger"
          onClick={async () => {
            if (confirm("¿Anular esta factura?")) {
              await voidInvoiceAction(id);
            }
          }}
        >
          Anular
        </Button>
      )}
    </div>
  );
}
