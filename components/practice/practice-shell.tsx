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
    <div className="flex min-h-screen w-full bg-gray-50 dark:bg-gray-950">
      {!navOpen ? (
        <button
          type="button"
          className="group flex min-h-screen w-10 shrink-0 cursor-pointer flex-col items-center justify-start border-r border-gray-200 bg-white pt-3 text-gray-800 shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.06)] transition-[background-color,box-shadow,border-color] hover:border-[#3EBDB5]/40 hover:bg-[#f0fdfa] hover:shadow-[inset_-1px_0_0_0_rgba(62,189,181,0.25),0_1px_3px_rgba(0,0,0,0.08)] active:bg-[#e6fffa] active:shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3EBDB5] focus-visible:ring-offset-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-[#3EBDB5]/35 dark:hover:bg-gray-800 dark:active:bg-gray-950 dark:focus-visible:ring-[#4ECDC4]"
          aria-expanded={false}
          aria-controls="practice-nav-drawer"
          aria-label="Open navigation menu"
          onClick={() => setNavOpen(true)}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-transparent bg-gray-50/90 text-gray-800 shadow-sm ring-1 ring-gray-200/80 transition-[box-shadow,transform] group-hover:border-[#3EBDB5]/40 group-hover:shadow-md group-active:scale-[0.97] dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-600 dark:group-hover:border-[#3EBDB5]/35">
            <Menu className="h-5 w-5 shrink-0" aria-hidden />
          </span>
        </button>
      ) : null}

      <div className="min-h-screen min-w-0 flex-1">{children}</div>

      {navOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[48] cursor-default bg-black/40 backdrop-blur-sm dark:bg-black/60"
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
    </div>
  )
}
