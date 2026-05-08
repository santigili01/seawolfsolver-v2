import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { getDashboardSidebarPayload } from "@/lib/dashboard-sidebar-server"
import { membershipShortLabel } from "@/lib/dashboard-access"

export default async function PracticeLayout({ children }: { children: React.ReactNode }) {
  const { displayName, accessTier, hasPurchases } = await getDashboardSidebarPayload({
    redirectPath: "/practice",
  })

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <DashboardSidebar
        displayName={displayName}
        planShortLabel={membershipShortLabel(accessTier)}
        showUpgrade={!hasPurchases}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
