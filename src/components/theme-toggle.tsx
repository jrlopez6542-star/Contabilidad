"use client";

import { useCallback, useEffect, useState } from "react";
import {
  THEME_KEY,
  applyTheme,
  resolveTheme,
  type Theme,
} from "@/lib/theme";

function readStoredTheme(): Theme {
  try {
    return resolveTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return "light";
  }
}

export function ThemeToggle({
  className = "",
}: {
  className?: string;
}) {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredTheme();
    setTheme(stored);
    applyTheme(stored);
    setReady(true);
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
    applyTheme(next);
    window.dispatchEvent(new Event("contabilidad-theme"));
  }, [theme]);

  if (!ready) {
    return (
      <span
        className={`inline-flex h-8 w-8 shrink-0 rounded-full border border-brand/10 bg-white/60 dark:border-brand-200/20 dark:bg-brand-900/60 ${className}`}
        aria-hidden
      />
    );
  }

  const isDark = theme === "dark";
  const label = isDark ? "Modo claro" : "Modo oscuro";

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-full border border-brand/15 bg-white/70 text-brand shadow-sm backdrop-blur transition hover:bg-brand-50 hover:opacity-100 opacity-70 dark:border-brand-200/25 dark:bg-brand-800/80 dark:text-brand-100 dark:hover:bg-brand-700 ${className}`}
    >
      {isDark ? (
        /* Sun → switch to light */
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
          />
        </svg>
      ) : (
        /* Moon → switch to dark */
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
          />
        </svg>
      )}
    </button>
  );
}
