"use client"

import { useAuth, UserButton } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  SiteLogoMark,
  SITE_BRAND_LOCKUP_ROOT_CLASS,
  SITE_BRAND_WORDMARK_CLASS,
} from "@/components/site-logo-mark"

const navLinks = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/practice", label: "Practice" },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const { userId, isLoaded } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 isolate border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85",
        scrolled ? "border-border/80" : "border-transparent",
      )}
    >
      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-3 py-3.5 pl-2 pr-2 sm:gap-x-4 sm:py-4 sm:pl-3 sm:pr-3 md:pl-4 md:pr-4">
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

        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 sm:gap-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {isLoaded && !userId ? (
            <>
              <a href="/sign-in" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Log In
              </a>
              <a href="/pricing" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Free Demo
              </a>
            </>
          ) : null}
          {isLoaded && userId ? (
            <>
              <a href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Dashboard
              </a>
              <UserButton />
            </>
          ) : null}
        </div>
      </div>
    </nav>
  )
}
