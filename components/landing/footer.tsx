import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  SiteLogoMark,
  SITE_BRAND_LOCKUP_ROOT_CLASS,
  SITE_BRAND_WORDMARK_CLASS,
} from "@/components/site-logo-mark"

const topLinks = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "/practice", label: "Practice" },
  { href: "/sign-in", label: "Log In" },
  { href: "/sea-wolf-demo", label: "Free Demo" },
  { href: "mailto:contact@seawolfprep.com", label: "Contact" },
]

const bottomLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refund-policy", label: "Refund Policy" },
]

export function Footer() {
  return (
    <footer className="border-t border-border py-8 pl-4 pr-4 sm:pl-6 sm:pr-6 lg:pl-4 lg:pr-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
          <Link
            href="/"
            className={cn("flex min-w-0 items-center gap-1", SITE_BRAND_LOCKUP_ROOT_CLASS)}
          >
            <SiteLogoMark />
            <span className={cn(SITE_BRAND_WORDMARK_CLASS, "text-foreground")}>SeaWolfPrep</span>
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            {topLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 SeaWolfPrep. Not affiliated with McKinsey & Company.</p>
          <div className="flex flex-wrap items-center gap-4">
            {bottomLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground sm:text-left">
          Not ready to buy? Try the free demo →{" "}
          <Link href="/sea-wolf-demo" className="font-medium text-primary hover:underline">
            /sea-wolf-demo
          </Link>
        </p>
      </div>
    </footer>
  )
}
