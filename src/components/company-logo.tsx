"use client";

import { useEffect, useState } from "react";
import { companyLogoSrc, DEFAULT_LOGO } from "@/lib/branding";

/** Light text + transparent bg — for dark UI chrome (header / login). */
export const DEFAULT_LOGO_DARK = "/logo-bunuelandia-header-dark.png";

function isBundledLightLogo(url: string): boolean {
  const u = url.split("?")[0];
  return (
    u === DEFAULT_LOGO ||
    u === "/logo-bunuelandia.png" ||
    u.endsWith("/logo-bunuelandia.png")
  );
}

function isAlreadyDarkLogo(url: string): boolean {
  const u = url.split("?")[0];
  return (
    u.includes("logo-bunuelandia-sidebar") ||
    u.includes("logo-bunuelandia-header-dark") ||
    u.includes("logo-bunuelandia-pdf")
  );
}

export function CompanyLogo({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const resolved = companyLogoSrc(src);
  const [url, setUrl] = useState(resolved);
  const [failed, setFailed] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const readDark = () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark");

    setDark(readDark());

    const onTheme = () => setDark(readDark());
    window.addEventListener("contabilidad-theme", onTheme);
    const obs = new MutationObserver(onTheme);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => {
      window.removeEventListener("contabilidad-theme", onTheme);
      obs.disconnect();
    };
  }, []);

  useEffect(() => {
    const base = companyLogoSrc(src);
    setFailed(false);
    if (dark && isBundledLightLogo(base) && !isAlreadyDarkLogo(base)) {
      setUrl(`${DEFAULT_LOGO_DARK}?v=1`);
    } else {
      setUrl(base);
    }
  }, [src, dark]);

  if (failed) {
    return (
      <span
        role="img"
        aria-label={`Logo de ${alt}`}
        className={`${className || ""} inline-flex items-center justify-center overflow-hidden text-center text-[10px] font-bold leading-tight text-brand dark:text-brand-100`}
      >
        {alt}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => {
        if (url.includes("header-dark")) {
          // fall back to light bundled logo if dark asset missing
          setUrl(companyLogoSrc(src));
          return;
        }
        if (url.split("?")[0] !== DEFAULT_LOGO && !url.includes("logo-bunuelandia.png")) {
          setUrl(DEFAULT_LOGO);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
