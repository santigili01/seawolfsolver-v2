"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  DollarSign,
  Gamepad2,
  Home,
  Inbox,
  LayoutDashboard,
  Settings,
  Sparkles,
} from "lucide-react"
import { DashboardSidebarThemeToggle } from "@/components/dashboard/dashboard-sidebar-theme-toggle"

function itemClasses(active: boolean) {
  return active
    ? "flex items-center gap-3 rounded-lg bg-[#1a202c] px-3 py-2 text-sm font-medium text-white"
    : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
}

export function DashboardSidebar({
  displayName,
  planShortLabel,
}: {
  displayName: string
  planShortLabel: string
}) {
  const pathname = usePathname()

  const initial = displayName.trim().charAt(0).toUpperCase() || "?"

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="p-4">
        <div className="mb-8 flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            🧫
          </span>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">SeaWolfPrep</span>
        </div>

        <nav className="space-y-1">
          <Link href="/" className={itemClasses(pathname === "/")}>
            <Home className="h-4 w-4 shrink-0" />
            Home
          </Link>
          <Link href="/dashboard" className={itemClasses(pathname === "/dashboard")}>
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Dashboard
          </Link>
          <Link href="/practice" className={itemClasses(pathname === "/practice")}>
            <Gamepad2 className="h-4 w-4 shrink-0" />
            Practice
          </Link>
          <Link href="/dashboard/analytics" className={itemClasses(pathname === "/dashboard/analytics")}>
            <BarChart3 className="h-4 w-4 shrink-0" />
            Analytics
          </Link>
          <Link href="/dashboard/inbox" className={itemClasses(pathname === "/dashboard/inbox")}>
            <Inbox className="h-4 w-4 shrink-0" />
            Inbox
          </Link>
          <Link href="/pricing" className={itemClasses(pathname === "/pricing")}>
            <DollarSign className="h-4 w-4 shrink-0" />
            Pricing
          </Link>
          <Link href="/dashboard/settings" className={itemClasses(pathname === "/dashboard/settings")}>
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </Link>
        </nav>
      </div>

      <div className="mt-auto space-y-3 border-t border-gray-200 p-4 dark:border-gray-800">
        <Link
          href="/pricing"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/60"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          Upgrade plan
        </Link>
        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">Appearance</p>
          <DashboardSidebarThemeToggle compact />
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/80">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-sm font-bold text-amber-950 dark:bg-amber-800 dark:text-amber-50">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{displayName}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{planShortLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
