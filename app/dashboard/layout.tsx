import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { membershipShortLabel, resolveTier, type AccessTier } from "@/lib/dashboard-access"
import { supabaseAdmin } from "@/utils/supabase/admin"

async function loadDashboardSidebarProps(): Promise<{
  displayName: string
  accessTier: AccessTier
}> {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in?redirect_url=/dashboard")

  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress ?? ""
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    email ||
    "User"

  const { data: purchases } = await supabaseAdmin
    .from("purchases")
    .select("variant_id")
    .eq("user_id", userId)

  const variantIds = (purchases ?? []).map((p) => p.variant_id).filter(Boolean)
  const accessTier = resolveTier(variantIds)

  return { displayName, accessTier }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { displayName, accessTier } = await loadDashboardSidebarProps()

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <DashboardSidebar displayName={displayName} planShortLabel={membershipShortLabel(accessTier)} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
