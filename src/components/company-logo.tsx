"use client";

import { useEffect, useState } from "react";
import { companyLogoSrc, DEFAULT_LOGO } from "@/lib/branding";

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

  useEffect(() => {
    setUrl(companyLogoSrc(src));
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <span
        role="img"
        aria-label={`Logo de ${alt}`}
        className={`${className || ""} inline-flex items-center justify-center overflow-hidden text-center text-[10px] font-bold leading-tight text-brand`}
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
        if (url !== DEFAULT_LOGO) {
          setUrl(DEFAULT_LOGO);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
