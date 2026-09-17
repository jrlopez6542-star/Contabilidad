"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteQuoteAction } from "@/actions/quotes";
import { Button } from "@/components/ui";

export function QuoteRowActions({
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

  if (status === "converted") return null;

  async function onDelete() {
    if (
      !confirm(
        `¿Eliminar la cotización ${number} de forma permanente? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await deleteQuoteAction(id);
      if (res?.error) {
        setError(res.error);
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      // leftover NEXT_REDIRECT if any
      router.push("/quotes");
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="danger"
        className="!min-h-11 !px-2.5 !py-1.5 !text-xs sm:!min-h-9"
        disabled={busy}
        onClick={onDelete}
      >
        Eliminar
      </Button>
      {error && (
        <span className="max-w-[10rem] text-right text-[10px] text-jam">
          {error}
        </span>
      )}
    </div>
  );
}
