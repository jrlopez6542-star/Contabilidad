"use client";

import { useState } from "react";
import { createProductAction } from "@/actions/products";
import { Button, Input } from "@/components/ui";

export function ProductForm() {
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const res = await createProductAction(formData);
    if (res?.error) setError(res.error);
    else {
      (document.getElementById("product-form") as HTMLFormElement)?.reset();
    }
  }

  return (
    <form id="product-form" action={onSubmit} className="space-y-3">
      <Input label="SKU" name="sku" required placeholder="SRV-001" />
      <Input label="Nombre" name="name" required />
      <Input label="Precio (COP sin IVA)" name="price" type="number" min={0} step={1} required />
      <Input label="IVA %" name="ivaRate" type="number" min={0} step={0.01} defaultValue={19} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full">
        Crear
      </Button>
    </form>
  );
}
