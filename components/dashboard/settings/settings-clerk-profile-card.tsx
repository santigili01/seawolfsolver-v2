"use client"

import { UserProfile } from "@clerk/nextjs"
import { useEffect, useRef } from "react"

function hideClerkSecurityNav(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("a[href*='security']").forEach((a) => {
    const row = (a.closest("button") ?? a.closest("[role='button']") ?? a.closest("li") ?? a) as HTMLElement
    row.style.display = "none"
  })
}

export function SettingsClerkProfileCard() {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = wrapRef.current
    if (!root) return

    hideClerkSecurityNav(root)
    const mo = new MutationObserver(() => hideClerkSecurityNav(root))
    mo.observe(root, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [])

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Account</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Profile, email, password, sessions, and connected accounts — managed by Clerk.
        </p>
      </div>
      <div ref={wrapRef} className="w-full min-w-0 overflow-x-auto p-4 sm:p-6">
        <UserProfile
          routing="hash"
          appearance={{
            elements: {
              rootBox: "w-full max-w-full min-w-0",
              card: "w-full max-w-full min-w-0 shadow-none border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950",
              navbar: "w-full sm:w-[unset]",
              scrollBox: "w-full max-w-full min-w-0",
            },
          }}
        />
      </div>
    </section>
  )
}
