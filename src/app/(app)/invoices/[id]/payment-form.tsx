"use client";

import { useState } from "react";
import { createPaymentAction } from "@/actions/payments";
import { Button, Input, Select, Textarea } from "@/components/ui";

export function PaymentQuickForm({
  invoiceId,
  maxAmount,
  methods,
  defaultMethod = "transferencia",
}: {
  invoiceId: string;
  maxAmount: number;
  methods: { value: string; label: string }[];
  defaultMethod?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(formData: FormData) {
    setError(null);
    formData.set("invoiceId", invoiceId);
    const res = await createPaymentAction(formData);
    if (res?.error) setError(res.error);
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <Input
        label="Monto"
        name="amount"
        type="number"
        min={1}
        step={1}
        required
        defaultValue={Math.round(maxAmount)}
      />
      <Select label="Método" name="method" defaultValue={defaultMethod || "transferencia"}>
        {methods.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </Select>
      <Input label="Fecha" name="paidAt" type="date" defaultValue={today} />
      <Textarea label="Notas" name="notes" rows={2} />
      {error && <p className="text-sm text-jam">{error}</p>}
      <Button type="submit" className="w-full">
        Registrar pago
      </Button>
    </form>
  );
}
