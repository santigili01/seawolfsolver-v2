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
    <footer className="relative z-0 border-t border-gray-200 bg-[#1a202c] px-4 py-16 text-slate-300 sm:px-6 sm:py-24 lg:px-8 dark:border-gray-800">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start justify-between gap-6 pb-6 sm:flex-row sm:items-center">
          <Link
            href="/"
            className={cn("flex min-w-0 items-center gap-1", SITE_BRAND_LOCKUP_ROOT_CLASS)}
          >
            <SiteLogoMark />
            <span className={cn(SITE_BRAND_WORDMARK_CLASS, "text-slate-100")}>SeaWolfPrep</span>
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            {topLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-slate-400 transition-colors hover:text-slate-100"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 SeaWolfPrep. Not affiliated with McKinsey & Company.</p>
          <div className="flex flex-wrap items-center gap-4">
            {bottomLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-slate-100">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-slate-400 sm:text-left">
          Not ready to buy? Try the free demo →{" "}
          <Link href="/sea-wolf-demo" className="font-medium text-primary hover:underline">
            /sea-wolf-demo
          </Link>
        </p>
      </div>
    </footer>
  )
}
