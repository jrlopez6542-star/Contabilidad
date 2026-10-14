"use client";

import { useCallback, useEffect, useRef } from "react";
import { endSessionAction } from "@/actions/auth";

/** Sin actividad en pantalla: 20 min. Fuera de la app / pantalla apagada: 10 min. */
const IDLE_MS = 20 * 60 * 1000;
const HIDDEN_MS = 10 * 60 * 1000;
const CHECK_EVERY_MS = 10_000;
const THROTTLE_BUMP_MS = 5_000;

const KEY_LAST_ACTIVE = "contabilidad_last_active";
const KEY_HIDDEN_AT = "contabilidad_hidden_at";
const KEY_LOGOUT_BROADCAST = "contabilidad_logout_broadcast";

/**
 * Cierra la sesión si el usuario deja la app quieta o sale del navegador / PWA
 * un rato largo, y redirige al login con reemplazo de historial (sin BFcache).
 */
export function SessionIdleGuard({ userId }: { userId?: string } = {}) {
  const lastActiveRef = useRef(Date.now());
  const lastBumpCallRef = useRef(0);
  const hiddenAtRef = useRef<number | null>(null);
  const lockingRef = useRef(false);

  const lockSession = useCallback(
    async (reason: "inactividad" | "seguridad" | "logout" = "inactividad") => {
      if (lockingRef.current) return;
      lockingRef.current = true;

      try {
        localStorage.removeItem(KEY_LAST_ACTIVE);
        localStorage.removeItem(KEY_HIDDEN_AT);
      } catch {
        /* ignore storage */
      }

      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        /* ignore */
      }

      try {
        await endSessionAction();
      } catch {
        /* ignore */
      }

      const msg =
        reason === "seguridad"
          ? "Sesión cerrada por seguridad al salir de la aplicación."
          : reason === "logout"
            ? "Sesión finalizada."
            : "Sesión cerrada por inactividad. Vuelve a iniciar sesión.";

      // replace evita que el botón 'Atrás' en móviles restaure la vista desde el historial
      window.location.replace(
        "/login?razon=" +
          encodeURIComponent(reason) +
          "&msg=" +
          encodeURIComponent(msg) +
          (userId ? `&u=${encodeURIComponent(userId)}` : "")
      );
    },
    [userId]
  );

  const checkExpired = useCallback((): boolean => {
    const now = Date.now();
    let hiddenAt: number | null = hiddenAtRef.current;
    let lastActive: number = lastActiveRef.current;

    try {
      const storedHidden = localStorage.getItem(KEY_HIDDEN_AT);
      if (storedHidden) {
        const val = Number(storedHidden);
        if (!isNaN(val) && val > 0) hiddenAt = val;
      }
      const storedActive = localStorage.getItem(KEY_LAST_ACTIVE);
      if (storedActive) {
        const val = Number(storedActive);
        if (!isNaN(val) && val > 0) lastActive = val;
      }
    } catch {
      /* ignore storage */
    }

    if (hiddenAt && now - hiddenAt >= HIDDEN_MS) {
      void lockSession("seguridad");
      return true;
    }

    if (now - lastActive >= IDLE_MS) {
      void lockSession("inactividad");
      return true;
    }

    return false;
  }, [lockSession]);

  useEffect(() => {
    // 1. Verificación inmediata al montar (cuando la PWA o pestaña se abre/recarga tras haber estado cerrada)
    if (checkExpired()) return;

    const bump = () => {
      const now = Date.now();
      if (now - lastBumpCallRef.current > THROTTLE_BUMP_MS) {
        lastBumpCallRef.current = now;
        lastActiveRef.current = now;
        hiddenAtRef.current = null;
        try {
          localStorage.setItem(KEY_LAST_ACTIVE, String(now));
          localStorage.removeItem(KEY_HIDDEN_AT);
        } catch {
          /* ignore */
        }
      }
    };

    // Inicializar timestamp actual
    bump();

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
        const now = Date.now();
        hiddenAtRef.current = now;
        try {
          localStorage.setItem(KEY_HIDDEN_AT, String(now));
          localStorage.setItem(KEY_LAST_ACTIVE, String(now));
        } catch {
          /* ignore */
        }
      } else {
        if (checkExpired()) return;
        bump();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onPageHide = () => {
      const now = Date.now();
      hiddenAtRef.current = now;
      try {
        localStorage.setItem(KEY_HIDDEN_AT, String(now));
        localStorage.setItem(KEY_LAST_ACTIVE, String(now));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pagehide", onPageHide);

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted || checkExpired()) return;
      bump();
    };
    window.addEventListener("pageshow", onPageShow);

    const onFocus = () => {
      if (checkExpired()) return;
      bump();
    };
    window.addEventListener("focus", onFocus);

    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY_LOGOUT_BROADCAST) {
        void lockSession("logout");
      }
    };
    window.addEventListener("storage", onStorage);

    const timer = window.setInterval(() => {
      checkExpired();
    }, CHECK_EVERY_MS);

    return () => {
      for (const ev of events) {
        window.removeEventListener(ev, bump);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(timer);
    };
  }, [checkExpired, lockSession]);

  return null;
}
