export const THEME_KEY = "contabilidad-theme";

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark";
}

/** Resolve stored preference; missing → match prefers-color-scheme. */
export function resolveTheme(stored: string | null | undefined): Theme {
  if (isTheme(stored)) return stored;
  if (typeof window !== "undefined") {
    try {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    } catch {
      /* ignore */
    }
  }
  return "light";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

/** Inline script: apply saved theme before paint (avoid flash). */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_KEY
)};var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}if(t==="dark")document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark");}catch(e){}})();`;
