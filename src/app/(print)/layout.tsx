import type { ReactNode } from "react";

/** Minimal layout for thermal HTML print (no app shell / sidebar). */
export default function PrintLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        color: "#000",
      }}
    >
      {children}
    </div>
  );
}
