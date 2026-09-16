"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/**
 * Fetches the thermal PDF ticket and opens the browser print dialog.
 * Same PDF as "Ticket térmico" — print matches download exactly.
 */
export function PrintPdfTicketButton({
  ticketHref,
  className = "",
  children = "Imprimir ticket",
}: {
  ticketHref: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  async function onPrint() {
    if (busy) return;
    setBusy(true);
    let objectUrl: string | null = null;
    let iframe: HTMLIFrameElement | null = null;
    try {
      const res = await fetch(ticketHref, { credentials: "same-origin" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text.slice(0, 200) || `Error ${res.status}`);
      }
      const blob = await res.blob();
      objectUrl = URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" })
      );

      iframe = document.createElement("iframe");
      iframe.setAttribute("title", "Ticket térmico");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = objectUrl;
      document.body.appendChild(iframe);

      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(
          () => reject(new Error("Timeout al cargar el PDF")),
          20000
        );
        iframe!.onload = () => {
          window.clearTimeout(timer);
          resolve();
        };
      });

      await new Promise((r) => setTimeout(r, 500));
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error("[print ticket]", err);
      const fallback = objectUrl || ticketHref;
      window.open(fallback, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
      window.setTimeout(() => {
        if (iframe?.parentNode) iframe.parentNode.removeChild(iframe);
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }, 60_000);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className={`w-full sm:w-auto ${className}`}
      disabled={busy}
      onClick={onPrint}
    >
      {busy ? "Preparando…" : children}
    </Button>
  );
}
