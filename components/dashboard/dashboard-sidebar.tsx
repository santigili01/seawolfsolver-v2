"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { BarChart3, ChevronDown, Gamepad2, Home, Play, Settings, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardSidebarThemeToggle } from "@/components/dashboard/dashboard-sidebar-theme-toggle"
import { SiteLogoMark } from "@/components/site-logo-mark"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function analyticsLastVisitStorageKey(clerkUserId: string) {
  return `seawolfprep_analytics_last_visit_${clerkUserId}`
}

function navItemClasses(active: boolean) {
  return cn(
    "relative flex items-center gap-3 rounded-lg py-2 pr-3 text-[1.09375rem] font-medium leading-snug transition-colors duration-150",
    active
      ? "border-l-2 border-[#4ECDC4] bg-white/10 pl-[calc(1rem-2px)] text-white"
      : "border-l-2 border-transparent pl-[calc(1rem-2px)] text-white/70 hover:bg-white/5 hover:text-white",
  )
}

export function DashboardSidebar({
  displayName,
  planShortLabel,
  showUpgrade,
  clerkUserId,
  latestRunPlayedAt,
  embedded = false,
}: {
  displayName: string
  planShortLabel: string
  showUpgrade: boolean
  clerkUserId: string
  latestRunPlayedAt: string | null
  /** When true (e.g. practice overlay drawer), sidebar is not `fixed` so it fills the drawer. */
  embedded?: boolean
}) {
  const pathname = usePathname()
  const initial = displayName.trim().charAt(0).toUpperCase() || "?"
  const [showAnalyticsDot, setShowAnalyticsDot] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const key = analyticsLastVisitStorageKey(clerkUserId)

    const refresh = () => {
      if (pathname === "/dashboard/analytics") {
        localStorage.setItem(key, new Date().toISOString())
        setShowAnalyticsDot(false)
        return
      }

      if (!latestRunPlayedAt) {
        setShowAnalyticsDot(false)
        return
      }

      const latestMs = new Date(latestRunPlayedAt).getTime()
      if (Number.isNaN(latestMs)) {
        setShowAnalyticsDot(false)
        return
      }

      const raw = localStorage.getItem(key)
      if (!raw) {
        setShowAnalyticsDot(true)
        return
      }
      const visitMs = new Date(raw).getTime()
      if (Number.isNaN(visitMs)) {
        setShowAnalyticsDot(true)
        return
      }
      setShowAnalyticsDot(latestMs > visitMs)
    }

    refresh()

    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        refresh()
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [pathname, clerkUserId, latestRunPlayedAt])

  return (
    <aside
      className={cn(
        "flex w-64 flex-col overflow-hidden border-r border-[rgba(78,205,196,0.2)] bg-[#0d1117] text-white",
        embedded ? "relative h-full min-h-0 w-full shrink-0" : "fixed left-0 top-0 z-40 h-dvh shrink-0",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url(/sea-wolf-biolum-background.png)",
          opacity: 0.04,
        }}
      />

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-white/10 px-4 py-6">
            <Link
              href="/dashboard"
              className="flex min-w-0 items-center text-[1.40625rem] leading-none text-white"
            >
              <span className="flex w-[2.25em] shrink-0 items-center justify-start pr-3">
                <SiteLogoMark className="origin-left scale-150" />
              </span>
              <span className="min-w-0 font-bold tracking-tight">SeaWolfPrep</span>
            </Link>
          </div>

          <nav className="flex min-h-0 flex-1 flex-col space-y-1 overflow-y-auto px-3 pt-4">
            <Link href="/dashboard" className={navItemClasses(pathname === "/dashboard")}>
              <Home className="h-5 w-5 shrink-0" />
              Home
            </Link>
            <Link href="/practice" className={navItemClasses(pathname === "/practice")}>
              <Gamepad2 className="h-5 w-5 shrink-0" />
              Practice
            </Link>
            <Link
              href="/dashboard/analytics"
              className={cn(navItemClasses(pathname === "/dashboard/analytics"), showAnalyticsDot && "pr-8")}
            >
              <BarChart3 className="h-5 w-5 shrink-0" />
              Analytics
              {showAnalyticsDot ? (
                <span
                  className="absolute right-3 top-1/2 size-2 -translate-y-1/2 rounded-full bg-[#4ECDC4] animate-pulse"
                  aria-hidden
                />
              ) : null}
            </Link>
            <Link href="/dashboard/settings" className={navItemClasses(pathname === "/dashboard/settings")}>
              <Settings className="h-5 w-5 shrink-0" />
              Settings
            </Link>

            <div className="pt-3">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-lg bg-[#4ECDC4] px-4 py-2.5 text-sm font-semibold text-[#0d1117] transition-colors duration-150 outline-none",
                    "hover:bg-[#3dbdb4] hover:shadow-[0_0_12px_rgba(78,205,196,0.3)] focus-visible:ring-2 focus-visible:ring-[#4ECDC4]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1117] data-[state=open]:bg-[#3dbdb4]",
                  )}
                >
                  <Play className="size-4 shrink-0 fill-current" aria-hidden />
                  Quick Run
                  <ChevronDown className="size-4 shrink-0 opacity-80" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  sideOffset={8}
                  className="min-w-[14rem] border-[rgba(78,205,196,0.25)] bg-[#161b22] p-1 text-white shadow-lg"
                >
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer text-[1.09375rem] text-white focus:bg-white/10 focus:text-white"
                  >
                    <Link href="/practice/sea-wolf">Sea Wolf</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer text-[1.09375rem] text-white focus:bg-white/10 focus:text-white"
                  >
                    <Link href="/practice/sea-wolf-treatment">Sea Wolf (Treatment)</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </nav>
        </div>

        <div className="shrink-0 space-y-3 border-t border-white/10 p-4">
          <div className="flex justify-center px-1">
            <DashboardSidebarThemeToggle compact />
          </div>
          {showUpgrade ? (
            <Link
              href="/pricing"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/15 px-3 py-2 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-400/25"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              Upgrade plan
            </Link>
          ) : null}
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-sm font-bold text-amber-950 dark:bg-amber-800 dark:text-amber-50">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href="/dashboard/settings"
                className="block truncate text-sm font-medium text-white underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ECDC4]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1117]"
              >
                {displayName}
              </Link>
              <p className="truncate text-xs text-white/50">{planShortLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
