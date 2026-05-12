import { PracticeAreaLayout } from "@/components/practice/practice-area-layout"
import { getDashboardSidebarPayload } from "@/lib/dashboard-sidebar-server"
import { membershipShortLabel } from "@/lib/dashboard-access"
import { requireSimulatorAccess } from "@/lib/require-simulator-access"

export default async function PracticeLayout({ children }: { children: React.ReactNode }) {
  await requireSimulatorAccess("/practice")
  const { displayName, accessTier, hasPurchases } = await getDashboardSidebarPayload({
    redirectPath: "/practice",
  })

  return (
    <PracticeAreaLayout
      displayName={displayName}
      planShortLabel={membershipShortLabel(accessTier)}
      showUpgrade={!hasPurchases}
    >
      {children}
    </PracticeAreaLayout>
  )
}
