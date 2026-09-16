"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_VIEWPORT,
  DESKTOP_VIEWPORT,
  VIEW_MODE_KEY,
  isViewMode,
  type ViewMode,
} from "@/lib/view-mode";

type ForcedMode = "mobile" | "desktop";

function applyViewMode(mode: ViewMode) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.viewMode = mode;
  let meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "viewport");
    document.head.appendChild(meta);
  }
  meta.setAttribute(
    "content",
    mode === "desktop" ? DESKTOP_VIEWPORT : DEFAULT_VIEWPORT
  );
}

function readStoredMode(): ViewMode {
  try {
    const raw = localStorage.getItem(VIEW_MODE_KEY);
    if (isViewMode(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "auto";
}

/** Resolve auto → current effective layout for the toggle label. */
function effectiveForced(mode: ViewMode): ForcedMode {
  if (mode === "mobile" || mode === "desktop") return mode;
  if (typeof window === "undefined") return "mobile";
  return window.matchMedia("(min-width: 768px)").matches ? "desktop" : "mobile";
}

export function ViewModeToggle({
  className = "",
}: {
  className?: string;
  /** @deprecated ignored — single compact toggle */
  compact?: boolean;
}) {
  const [mode, setMode] = useState<ViewMode>("auto");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredMode();
    setMode(stored);
    applyViewMode(stored);
    setReady(true);
  }, []);

  const toggle = useCallback(() => {
    const current = effectiveForced(mode);
    const next: ForcedMode = current === "mobile" ? "desktop" : "mobile";
    setMode(next);
    try {
      localStorage.setItem(VIEW_MODE_KEY, next);
    } catch {
      /* ignore */
    }
    applyViewMode(next);
    window.dispatchEvent(new Event("contabilidad-view-mode"));
  }, [mode]);

  if (!ready) {
    return (
      <span
        className={`inline-flex h-8 w-8 shrink-0 rounded-full border border-brand/10 bg-white/60 dark:border-brand-200/20 dark:bg-brand-900/60 ${className}`}
        aria-hidden
      />
    );
  }

  const current = effectiveForced(mode);
  const isMobile = current === "mobile";
  const nextLabel = isMobile ? "Vista escritorio" : "Vista celular";

  return (
    <button
      type="button"
      onClick={toggle}
      title={nextLabel}
      aria-label={nextLabel}
      className={`inline-flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-full border border-brand/15 bg-white/70 text-brand shadow-sm backdrop-blur transition hover:bg-brand-50 hover:opacity-100 opacity-70 dark:border-brand-200/25 dark:bg-brand-800/80 dark:text-brand-100 dark:hover:bg-brand-700 ${className}`}
    >
      {isMobile ? (
        /* Monitor icon → switch to desktop */
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ) : (
        /* Phone icon → switch to mobile */
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
}
