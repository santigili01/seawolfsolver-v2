"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  SiteLogoMark,
  SITE_BRAND_LOCKUP_ROOT_CLASS,
  SITE_BRAND_WORDMARK_CLASS,
} from "@/components/site-logo-mark"

const navLinks = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav
      className={`sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 ${
        scrolled ? "border-b border-border" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className={cn(
            "flex min-w-0 items-center gap-1",
            SITE_BRAND_LOCKUP_ROOT_CLASS
          )}
        >
          <SiteLogoMark />
          <span className={cn(SITE_BRAND_WORDMARK_CLASS, "text-foreground")}>SeaWolfPrep</span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/sea-wolf-demo">Free Demo</Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
