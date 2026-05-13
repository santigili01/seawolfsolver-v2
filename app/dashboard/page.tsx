import type { Metadata } from "next"
import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { buildDashboardHomeAnalytics, type UserProgressRow } from "@/lib/dashboard-home-analytics"
import type { GameResultRow } from "@/lib/game-result-types"
import { supabaseAdmin } from "@/utils/supabase/admin"

export const metadata: Metadata = {
  title: "Dashboard | SeaWolfPrep",
  description: "Your account overview, access status, and game activity.",
}

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in?redirect_url=/dashboard")

  const user = await currentUser()
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "User"
  const firstName = user?.firstName?.trim() || displayName.split(/\s+/)[0] || "there"

  const [resultsRes, progressRes] = await Promise.all([
    supabaseAdmin
      .from("game_results")
      .select("*")
      .eq("user_id", userId)
      .order("played_at", { ascending: false })
      .limit(200),
    supabaseAdmin.from("user_progress").select("*").eq("user_id", userId).maybeSingle(),
  ])

  if (resultsRes.error) {
    console.error("[dashboard] game_results", resultsRes.error)
  }
  if (progressRes.error) {
    console.error("[dashboard] user_progress", progressRes.error)
  }

  const initialResults = (resultsRes.data ?? []) as GameResultRow[]
  const userProgress = (progressRes.data ?? null) as UserProgressRow | null
  const analytics = buildDashboardHomeAnalytics(initialResults, userProgress)

  return <DashboardShell firstName={firstName} analytics={analytics} />
}
