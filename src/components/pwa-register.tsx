"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Only register on https or localhost
    const ok =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (!ok) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // Silent — PWA install still works via manifest without SW in some browsers
      }
    };

    // Defer so first paint isn't blocked
    if ("requestIdleCallback" in window) {
      (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(
        () => {
          void register();
        }
      );
    } else {
      setTimeout(() => {
        void register();
      }, 1200);
    }
  }, []);

  return null;
}
