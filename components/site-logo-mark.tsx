import { cn } from "@/lib/utils"

/** Public URL for `public/wolf svg.svg` (space encoded). */
export const SITE_LOGO_SRC = "/wolf%20svg.svg"

/** Sets font-size / line-height for the lockup; pair with `SiteLogoMark` (`1.5em` = 150% of this size). */
export const SITE_BRAND_LOCKUP_ROOT_CLASS = "text-[1.6875rem] leading-none"

/** Wordmark typography (place inside a root that includes {@link SITE_BRAND_LOCKUP_ROOT_CLASS}). */
export const SITE_BRAND_WORDMARK_CLASS = "font-bold tracking-tight"

type SiteLogoMarkProps = {
  className?: string
}

/**
 * Wolf mark sized to **1.5×** the lockup’s font-size (50% taller than the wordmark text block).
 * Must sit inside a parent with {@link SITE_BRAND_LOCKUP_ROOT_CLASS} (or same `font-size`).
 */
export function SiteLogoMark({ className }: SiteLogoMarkProps) {
  return (
    <img
      src={SITE_LOGO_SRC}
      alt=""
      width={40}
      height={40}
      decoding="async"
      className={cn(
        "h-[1.5em] w-[1.5em] shrink-0 object-contain object-left",
        className
      )}
      aria-hidden
    />
  )
}
