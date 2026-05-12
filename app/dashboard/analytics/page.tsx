import type { Metadata } from "next"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { RunAnalyticsClient } from "@/components/dashboard/run-analytics-client"
import type { GameResultRow } from "@/lib/game-result-types"
import { supabaseAdmin } from "@/utils/supabase/admin"

export const metadata: Metadata = {
  title: "Analytics | SeaWolfPrep",
  description: "Track your Sea Wolf full-session scores over time.",
}

export default async function DashboardAnalyticsPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent("/dashboard/analytics")}`)
  }

  const { data, error } = await supabaseAdmin
    .from("game_results")
    .select("*")
    .eq("user_id", userId)
    .order("played_at", { ascending: false })
    .limit(200)

  if (error) {
    console.error("[dashboard/analytics]", error)
  }

  const initialResults = (data ?? []) as GameResultRow[]

  return <RunAnalyticsClient initialResults={initialResults} />
}
