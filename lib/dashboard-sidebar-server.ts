import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { resolveTier, type AccessTier } from "@/lib/dashboard-access"
import { supabaseAdmin } from "@/utils/supabase/admin"

export async function getDashboardSidebarPayload(options: {
  redirectPath: string
}): Promise<{ displayName: string; accessTier: AccessTier; hasPurchases: boolean }> {
  const { redirectPath } = options
  const { userId } = await auth()
  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`)
  }

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

  const rows = purchases ?? []
  const hasPurchases = rows.length > 0
  const variantIds = rows.map((p) => p.variant_id).filter(Boolean)
  const accessTier = resolveTier(variantIds)

  return { displayName, accessTier, hasPurchases }
}
