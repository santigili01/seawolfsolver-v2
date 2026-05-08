"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function DashboardSidebarThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const active = mounted ? (theme === "system" ? resolvedTheme : theme) : "light"

  if (!mounted) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-gray-50 ${compact ? "h-9" : "h-10"} w-full animate-pulse dark:border-gray-700 dark:bg-gray-800`} />
    )
  }

  return (
    <div
      className={`flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800 ${compact ? "gap-0.5" : "gap-1"}`}
      role="group"
      aria-label="Theme"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
          active === "light"
            ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
            : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        }`}
      >
        <Sun className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {!compact ? "Light" : null}
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
          active === "dark"
            ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
            : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        }`}
      >
        <Moon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {!compact ? "Dark" : null}
      </button>
    </div>
  )
}
