"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

/** Prints the same thermal PDF as /quotes/[id]/ticket */
export default function TicketPrintPage() {
  const params = useParams();
  const id = String(params?.id || "");

  useEffect(() => {
    if (!id) return;
    let objectUrl: string | null = null;
    let iframe: HTMLIFrameElement | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/quotes/${id}/ticket`, {
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
        iframe.style.inset = "0";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "0";
        iframe.src = objectUrl;
        document.body.appendChild(iframe);
        await new Promise<void>((resolve) => {
          iframe!.onload = () => resolve();
        });
        await new Promise((r) => setTimeout(r, 500));
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error(e);
        window.location.href = `/quotes/${id}/ticket`;
      }
    })();

    return () => {
      cancelled = true;
      if (iframe?.parentNode) iframe.parentNode.removeChild(iframe);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  return (
    <p style={{ fontFamily: "system-ui", padding: 16 }}>
      Preparando ticket PDF para imprimir…
    </p>
  );
}
