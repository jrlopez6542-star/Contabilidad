"use client";

import { useMemo, useState } from "react";
import { createPaymentAction } from "@/actions/payments";
import { Button, Input, Select, Textarea } from "@/components/ui";

type Inv = { id: string; label: string; balance: number };

export function PaymentPageForm({
  invoices,
  methods,
}: {
  invoices: Inv[];
  methods: { value: string; label: string }[];
}) {
  const [invoiceId, setInvoiceId] = useState(invoices[0]?.id || "");
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const selected = useMemo(
    () => invoices.find((i) => i.id === invoiceId),
    [invoices, invoiceId]
  );

  async function onSubmit(formData: FormData) {
    setError(null);
    formData.set("invoiceId", invoiceId);
    const res = await createPaymentAction(formData);
    if (res?.error) setError(res.error);
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <Select
        label="Factura"
        value={invoiceId}
        onChange={(e) => setInvoiceId(e.target.value)}
      >
        {invoices.map((i) => (
          <option key={i.id} value={i.id}>
            {i.label}
          </option>
        ))}
      </Select>
      <Input
        label="Monto"
        name="amount"
        type="number"
        min={1}
        step={1}
        required
        key={selected?.id}
        defaultValue={selected ? Math.round(selected.balance) : undefined}
      />
      <Select label="Método" name="method" defaultValue="transferencia">
        {methods.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </Select>
      <Input label="Fecha" name="paidAt" type="date" defaultValue={today} />
      <Textarea label="Notas" name="notes" rows={2} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full">
        Registrar
      </Button>
    </form>
  );
}
