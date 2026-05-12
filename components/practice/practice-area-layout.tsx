"use client"

import { usePathname } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { PracticeShell } from "@/components/practice/practice-shell"

export function PracticeAreaLayout({
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
  const pathname = usePathname()
  const normalized = pathname.replace(/\/$/, "") || "/"
  const hub = normalized === "/practice"

  if (hub) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
        <DashboardSidebar
          displayName={displayName}
          planShortLabel={planShortLabel}
          showUpgrade={showUpgrade}
        />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    )
  }

  return (
    <PracticeShell displayName={displayName} planShortLabel={planShortLabel} showUpgrade={showUpgrade}>
      {children}
    </PracticeShell>
  )
}
