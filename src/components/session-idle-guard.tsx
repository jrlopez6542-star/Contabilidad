"use client";

import { useCallback, useEffect, useRef } from "react";
import { endSessionAction } from "@/actions/auth";

/** Sin actividad: 10 min. Fuera de la pestaña/app: 2 min. */
const IDLE_MS = 10 * 60 * 1000;
const HIDDEN_MS = 2 * 60 * 1000;
const CHECK_EVERY_MS = 15_000;

/**
 * Cierra la sesión si el usuario deja la app quieta o sale del navegador
 * un rato, y redirige al login.
 */
export function SessionIdleGuard() {
  const lastActiveRef = useRef(Date.now());
  const hiddenAtRef = useRef<number | null>(null);
  const lockingRef = useRef(false);

  const lockSession = useCallback(async () => {
    if (lockingRef.current) return;
    lockingRef.current = true;
    try {
      await endSessionAction();
    } catch {
      /* ignore */
    }
    window.location.href =
      "/login?razon=inactividad&msg=" +
      encodeURIComponent(
        "Sesión cerrada por inactividad. Vuelve a iniciar sesión."
      );
  }, []);

  useEffect(() => {
    const bump = () => {
      lastActiveRef.current = Date.now();
    };

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
    ];
    for (const ev of events) {
      window.addEventListener(ev, bump, { passive: true });
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
      } else {
        const hiddenAt = hiddenAtRef.current;
        hiddenAtRef.current = null;
        if (hiddenAt && Date.now() - hiddenAt >= HIDDEN_MS) {
          void lockSession();
          return;
        }
        bump();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onPageHide = () => {
      hiddenAtRef.current = Date.now();
    };
    window.addEventListener("pagehide", onPageHide);

    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") {
        const hiddenAt = hiddenAtRef.current ?? Date.now();
        if (Date.now() - hiddenAt >= HIDDEN_MS) {
          void lockSession();
        }
        return;
      }
      if (Date.now() - lastActiveRef.current >= IDLE_MS) {
        void lockSession();
      }
    }, CHECK_EVERY_MS);

    return () => {
      for (const ev of events) {
        window.removeEventListener(ev, bump);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.clearInterval(timer);
    };
  }, [lockSession]);

  return null;
}
