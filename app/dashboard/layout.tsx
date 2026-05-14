import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { getDashboardSidebarPayload } from "@/lib/dashboard-sidebar-server"
import { membershipShortLabel } from "@/lib/dashboard-access"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { displayName, accessTier, hasPurchases, clerkUserId, latestRunPlayedAt } =
    await getDashboardSidebarPayload({
      redirectPath: "/dashboard",
    })

  return (
    <div className="min-h-screen bg-gray-50 pl-64 dark:bg-gray-950">
      <DashboardSidebar
        displayName={displayName}
        planShortLabel={membershipShortLabel(accessTier)}
        showUpgrade={!hasPurchases}
        clerkUserId={clerkUserId}
        latestRunPlayedAt={latestRunPlayedAt}
      />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
