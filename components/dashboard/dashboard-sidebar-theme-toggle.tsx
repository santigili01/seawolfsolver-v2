"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function DashboardSidebarThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const active = mounted ? (theme === "system" ? resolvedTheme : theme) : "light"

  if (!mounted) {
    if (compact) {
      return <div className="h-8 w-8 shrink-0 rounded-md bg-white/10 animate-pulse" aria-hidden />
    }
    return (
      <div
        className={`flex rounded-lg border border-gray-200 bg-gray-50 ${compact ? "h-9" : "h-10"} w-full animate-pulse dark:border-gray-700 dark:bg-gray-800`}
      />
    )
  }

  if (compact) {
    const isLight = active === "light"
    const label = isLight ? "Switch to dark mode" : "Switch to light mode"
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setTheme(isLight ? "dark" : "light")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/40 transition-colors duration-150 hover:bg-white/5 hover:text-white/70"
            aria-label={label}
          >
            {isLight ? <Sun className="size-4 shrink-0" aria-hidden /> : <Moon className="size-4 shrink-0" aria-hidden />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={6}>
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div
      className={cn(
        "flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800",
        "gap-1",
      )}
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
        Light
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
        Dark
      </button>
    </div>
  )
}
