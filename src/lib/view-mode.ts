export const VIEW_MODE_KEY = "contabilidad-view-mode";

export const VIEW_MODES = ["auto", "mobile", "desktop"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  auto: "Automático",
  mobile: "Celular",
  desktop: "Escritorio",
};

export function isViewMode(value: string | null | undefined): value is ViewMode {
  return value === "auto" || value === "mobile" || value === "desktop";
}

export const DEFAULT_VIEWPORT =
  "width=device-width, initial-scale=1, viewport-fit=cover";
export const DESKTOP_VIEWPORT = "width=1024";

/** Inline script: apply saved mode before paint (avoid layout flash). */
export const VIEW_MODE_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  VIEW_MODE_KEY
)};var m=localStorage.getItem(k);if(m!=="auto"&&m!=="mobile"&&m!=="desktop")m="auto";document.documentElement.dataset.viewMode=m;var meta=document.querySelector('meta[name="viewport"]');if(!meta){meta=document.createElement("meta");meta.name="viewport";document.head.appendChild(meta);}meta.setAttribute("content",m==="desktop"?${JSON.stringify(
  DESKTOP_VIEWPORT
)}:${JSON.stringify(DEFAULT_VIEWPORT)});}catch(e){document.documentElement.dataset.viewMode="auto";}})();`;
