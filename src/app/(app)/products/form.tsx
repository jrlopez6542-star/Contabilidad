"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProductAction } from "@/actions/products";
import { Button, Input } from "@/components/ui";

type ProductFormProps = {
  redirectTo?: string;
};

export function ProductForm({ redirectTo }: ProductFormProps = {}) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    setError(null);
    const res = await createProductAction(formData);
    if (res?.error) setError(res.error);
    else if (redirectTo) {
      router.push(redirectTo);
      router.refresh();
    } else {
      (document.getElementById("product-form") as HTMLFormElement)?.reset();
    }
  }

  return (
    <form id="product-form" action={onSubmit} className="space-y-3">
      <Input label="SKU" name="sku" required placeholder="SRV-001" />
      <Input label="Nombre" name="name" required />
      <Input label="Precio (COP sin IVA)" name="price" type="number" min={0} step={1} required />
      <Input label="IVA %" name="ivaRate" type="number" min={0} step={0.01} defaultValue={19} />
      <Input label="Stock inicial" name="stock" type="number" min={0} step={0.01} defaultValue={0} />
      <Input label="Stock mínimo (alerta)" name="minStock" type="number" min={0} step={0.01} defaultValue={5} />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="trackStock" value="true" defaultChecked />
        Controlar inventario
      </label>
      {error && <p className="text-sm text-jam">{error}</p>}
      <Button type="submit" className="w-full">
        Crear
      </Button>
    </form>
  );
}
