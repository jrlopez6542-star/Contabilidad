"use client";

import { Suspense, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";

function TicketPrintInner() {
  const params = useParams();
  const search = useSearchParams();
  const id = String(params?.id || "");
  const nextRaw = search.get("next") || `/invoices/${id}`;
  const next = nextRaw.startsWith("/") ? nextRaw : `/invoices/${id}`;

  useEffect(() => {
    if (!id) return;
    let objectUrl: string | null = null;
    let iframe: HTMLIFrameElement | null = null;
    let cancelled = false;
    let fallbackTimer: number | undefined;

    const goNext = () => {
      if (cancelled) return;
      cancelled = true;
      window.location.href = next;
    };

    const onAfterPrint = () => {
      window.setTimeout(goNext, 300);
    };
    window.addEventListener("afterprint", onAfterPrint);

    (async () => {
      try {
        const res = await fetch(`/invoices/${id}/ticket`, {
          credentials: "same-origin",
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(
          new Blob([blob], { type: "application/pdf" })
        );
        iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "1px";
        iframe.style.height = "1px";
        iframe.style.opacity = "0";
        iframe.style.border = "0";
        iframe.src = objectUrl;
        document.body.appendChild(iframe);
        await new Promise<void>((resolve) => {
          iframe!.onload = () => resolve();
        });
        await new Promise((r) => setTimeout(r, 500));
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        fallbackTimer = window.setTimeout(goNext, 120_000);
      } catch (e) {
        console.error(e);
        window.location.href = `/invoices/${id}/ticket`;
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", onAfterPrint);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      if (iframe?.parentNode) iframe.parentNode.removeChild(iframe);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, next]);

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <p>Preparando ticket para imprimir…</p>
      <p style={{ fontSize: 13, color: "#666", marginTop: 8 }}>
        Al cerrar la impresión volverás al mostrador.
      </p>
      <p style={{ marginTop: 16 }}>
        <a href={next}>Continuar sin esperar</a>
        {" · "}
        <a href={`/invoices/${id}`}>Ver factura</a>
      </p>
    </div>
  );
}

export default function TicketPrintPage() {
  return (
    <Suspense
      fallback={
        <p style={{ fontFamily: "system-ui", padding: 16 }}>
          Preparando ticket…
        </p>
      }
    >
      <TicketPrintInner />
    </Suspense>
  );
}
