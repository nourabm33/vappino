import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";

interface LogoProps {
  /** Rendered height in px; width follows the logo's native aspect ratio. */
  height?: number;
  priority?: boolean;
  className?: string;
  linked?: boolean;
}

export function Logo({ height = 48, priority, className, linked = true }: LogoProps) {
  const width = Math.round((SITE.logo.width / SITE.logo.height) * height);
  const src = height > 120 ? SITE.logo.src : SITE.logo.srcSmall;
  const img = (
    <Image
      src={src}
      alt={linked ? `${SITE.name} — Accueil` : SITE.logo.alt}
      width={width}
      height={height}
      priority={priority}
      className={className}
      style={{ width, height: "auto" }}
      unoptimized
    />
  );
  if (!linked) return img;
  return (
    <Link href="/" aria-label={`${SITE.name} — Accueil`} style={{ display: "inline-flex" }}>
      {img}
    </Link>
  );
}
