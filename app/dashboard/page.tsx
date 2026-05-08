import type { Metadata } from "next"
import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { DashboardShell, type AccessTier } from "@/components/dashboard/dashboard-shell"
import { userHasAccess } from "@/lib/access"
import { supabaseAdmin } from "@/utils/supabase/admin"

export const metadata: Metadata = {
  title: "Dashboard | SeaWolfPrep",
  description: "Your account overview, access status, and game activity.",
}

function resolveTier(variantIds: string[]): AccessTier {
  const fullVariant = process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR_SOLVER
  const simulatorVariant = process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR

  if (fullVariant && variantIds.includes(fullVariant)) return "simulator_solver"
  if (simulatorVariant && variantIds.includes(simulatorVariant)) return "simulator"
  return "none"
}

export default async function DashboardPage() {
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
  const hasAccess = await userHasAccess(userId)

  return (
    <DashboardShell
      displayName={displayName}
      email={email}
      accessTier={accessTier}
      hasAccess={hasAccess}
    />
  )
}
