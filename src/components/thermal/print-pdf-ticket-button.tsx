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
  const [error, setError] = useState<string | null>(null);

  async function onPrint() {
    if (busy) return;
    setBusy(true);
    setError(null);
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

      // Prefer a new window: more reliable print dialog than a 0×0 iframe
      // (CSP / PDF viewers often block print() on hidden frames).
      const w = window.open(objectUrl, "_blank", "noopener,noreferrer");
      if (w) {
        const tryPrint = () => {
          try {
            w.focus();
            w.print();
          } catch {
            /* user can print from the PDF viewer */
          }
        };
        // Some browsers fire load late for blob PDFs
        window.setTimeout(tryPrint, 600);
        window.setTimeout(tryPrint, 1500);
      } else {
        // Popup blocked — fall back to off-screen iframe print
        iframe = document.createElement("iframe");
        iframe.setAttribute("title", "Ticket térmico");
        iframe.setAttribute("aria-hidden", "true");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "1px";
        iframe.style.height = "1px";
        iframe.style.opacity = "0";
        iframe.style.pointerEvents = "none";
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

        await new Promise((r) => setTimeout(r, 700));
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }
    } catch (err) {
      console.error("[print ticket]", err);
      const msg =
        err instanceof Error ? err.message : "No se pudo preparar el ticket.";
      setError(msg);
      if (objectUrl) {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      } else {
        window.open(ticketHref, "_blank", "noopener,noreferrer");
      }
    } finally {
      setBusy(false);
      window.setTimeout(() => {
        if (iframe?.parentNode) iframe.parentNode.removeChild(iframe);
        // Keep objectUrl alive longer so the print window can use it
      }, 120_000);
    }
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Button
        type="button"
        variant="secondary"
        className="w-full sm:w-auto"
        disabled={busy}
        onClick={onPrint}
      >
        {busy ? "Preparando…" : children}
      </Button>
      {error && (
        <p className="text-xs text-jam" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
