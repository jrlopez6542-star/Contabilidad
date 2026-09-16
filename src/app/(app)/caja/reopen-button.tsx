"use client";

import { useState } from "react";
import { reopenCajaAction } from "@/actions/caja";
import { Button } from "@/components/ui";

export function CajaReopenButton({ date }: { date: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!confirm(`¿Reabrir la caja del ${date}?`)) return;
    setPending(true);
    setError(null);
    const fd = new FormData();
    fd.set("date", date);
    const res = await reopenCajaAction(fd);
    setPending(false);
    if (res?.error) setError(res.error);
  }

  return (
    <div className="pt-2">
      <Button
        type="button"
        variant="secondary"
        onClick={onClick}
        disabled={pending}
      >
        {pending ? "…" : "Reabrir caja"}
      </Button>
      {error && <p className="mt-1 text-sm text-jam">{error}</p>}
    </div>
  );
}
