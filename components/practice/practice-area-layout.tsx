"use client"

import { usePathname } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { PracticeShell } from "@/components/practice/practice-shell"

export function PracticeAreaLayout({
  children,
  displayName,
  planShortLabel,
  showUpgrade,
  clerkUserId,
  latestRunPlayedAt,
}: {
  children: React.ReactNode
  displayName: string
  planShortLabel: string
  showUpgrade: boolean
  clerkUserId: string
  latestRunPlayedAt: string | null
}) {
  const pathname = usePathname()
  const normalized = pathname.replace(/\/$/, "") || "/"
  const hub = normalized === "/practice"

  if (hub) {
    return (
      <div className="min-h-screen bg-gray-50 pl-64 dark:bg-gray-950">
        <DashboardSidebar
          displayName={displayName}
          planShortLabel={planShortLabel}
          showUpgrade={showUpgrade}
          clerkUserId={clerkUserId}
          latestRunPlayedAt={latestRunPlayedAt}
        />
        <div className="min-w-0">{children}</div>
      </div>
    )
  }

  return (
    <PracticeShell
      displayName={displayName}
      planShortLabel={planShortLabel}
      showUpgrade={showUpgrade}
      clerkUserId={clerkUserId}
      latestRunPlayedAt={latestRunPlayedAt}
    >
      {children}
    </PracticeShell>
  )
}
