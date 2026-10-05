"use client";

import { useEffect } from "react";
import { Button, Card, PageHeader } from "@/components/ui";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App boundary error:", error);
  }, [error]);

  return (
    <div className="py-8">
      <PageHeader
        title="Algo salió mal"
        subtitle="Ocurrió un error inesperado al procesar la solicitud."
      />
      <Card className="max-w-xl">
        <p className="text-sm text-slate-600 dark:text-brand-200">
          {error.message || "No se pudo cargar la vista solicitada."}
        </p>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => reset()} variant="primary">
            Reintentar
          </Button>
          <Button
            onClick={() => (window.location.href = "/dashboard")}
            variant="secondary"
          >
            Ir al inicio
          </Button>
        </div>
      </Card>
    </div>
  );
}
