"use client"

import { useEffect, useState } from "react"
import { Menu } from "lucide-react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

export function PracticeShell({
  children,
  displayName,
  planShortLabel,
  showUpgrade,
}: {
  children: React.ReactNode
  displayName: string
  planShortLabel: string
  showUpgrade: boolean
}) {
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (navOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [navOpen])

  return (
    <div className="relative min-h-screen w-full bg-gray-50 dark:bg-gray-950">
      {!navOpen ? (
        <button
          type="button"
          className="fixed left-3 top-16 z-[45] flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-800 shadow-md dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          aria-expanded={false}
          aria-controls="practice-nav-drawer"
          aria-label="Open navigation menu"
          onClick={() => setNavOpen(true)}
        >
          <Menu className="h-5 w-5 shrink-0" aria-hidden />
        </button>
      ) : null}

      {navOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[48] cursor-default bg-black/40 dark:bg-black/60"
            aria-label="Close navigation menu"
            onClick={() => setNavOpen(false)}
          />
          <div
            id="practice-nav-drawer"
            className="fixed inset-y-0 left-0 z-[50] h-screen w-64 overflow-y-auto shadow-2xl [&_aside]:min-h-full"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <DashboardSidebar
              displayName={displayName}
              planShortLabel={planShortLabel}
              showUpgrade={showUpgrade}
            />
          </div>
        </>
      ) : null}

      <div className="min-h-screen w-full">{children}</div>
    </div>
  )
}
