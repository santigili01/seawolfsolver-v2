import type { GameResultGameType, GameResultRow } from "@/lib/game-result-types"
import { normalizeRowGameType, pickDefaultFilteredGameType } from "@/lib/game-results-utils"

/** Row from `public.user_progress` (one per user). */
export type UserProgressRow = {
  user_id: string
  has_completed_first_run: boolean
  has_used_solver: boolean
  has_read_guide: boolean
  has_reviewed_analytics: boolean
}

export type DashboardHomeAnalytics = {
  hasAnyRuns: boolean
  lastRunGlobalScorePct: number | null
  primaryGameType: GameResultGameType | null
  runsRecorded: number
  bestScorePct: number | null
  avgScorePct: number | null
  last5AvgPct: number | null
  last5SampleSize: number
  showTrendUp: boolean
  showTrendDown: boolean
  weakestPhase: { name: string; avgPct: number; tip: string } | null
  checklistFirstRunDone: boolean
  checklistSolverUsed: boolean
  checklistAnalyticsReviewed: boolean
  checklistGuideRead: boolean
}

const PHASE_KEYS = [
  { key: "phase1_avg" as const, name: "Phase 1 — Profile" },
  { key: "phase2_avg" as const, name: "Phase 2 — Categorize" },
  { key: "phase0_avg" as const, name: "Phase 0 — Review" },
  { key: "phase3_avg" as const, name: "Phase 3 — Prospect Pool" },
  { key: "phase4_avg" as const, name: "Phase 4 — Treatment" },
] as const

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function tipForPhase(name: string): string {
  if (name.includes("Prospect Pool")) {
    return "This is where most candidates lose points. Practice picking optimal candidates under time pressure."
  }
  if (name.includes("Treatment")) {
    return "Treatment rewards consistent, evidence-backed moves. Review optimal sequencing after each run."
  }
  if (name.includes("Categorize")) {
    return "Speed and consistency in tagging traits matter here — hesitation costs points. Drill categorization until each decision feels automatic."
  }
  if (name.includes("Profile") || name.includes("Review")) {
    return "Early phases set up your later score — tighten accuracy here to reduce time pressure later."
  }
  return "Drill this phase in practice to lift speed and accuracy under exam conditions."
}

function weakestPhaseFromSeaWolfRuns(rows: GameResultRow[]): { name: string; avgPct: number; tip: string } | null {
  if (rows.length === 0) return null
  let weakest: { name: string; avgPct: number } | null = null
  for (const def of PHASE_KEYS) {
    const vals = rows
      .map((r) => r[def.key])
      .filter((v): v is number => v != null && !Number.isNaN(Number(v)))
      .map(Number)
    const m = mean(vals)
    if (m == null) continue
    const avgPct = Math.round(m * 10) / 10
    if (!weakest || avgPct < weakest.avgPct) {
      weakest = { name: def.name, avgPct }
    }
  }
  if (!weakest) return null
  return { ...weakest, tip: tipForPhase(weakest.name) }
}

/**
 * Build dashboard home metrics from `game_results` rows (same source as /dashboard/analytics).
 * Checklist flags use `user_progress` when present; if there is no progress row yet, first-run and
 * analytics-review fall back to `game_results` heuristics so existing users still see accurate state.
 */
export function buildDashboardHomeAnalytics(
  results: GameResultRow[],
  userProgress: UserProgressRow | null,
): DashboardHomeAnalytics {
  const hasAnyRuns = results.length > 0

  const sortedAll = [...results].sort(
    (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime(),
  )
  const lastRunGlobalScorePct =
    sortedAll.length > 0 ? Math.round(Number(sortedAll[0]!.global_score) * 10) / 10 : null

  const primaryGameType = pickDefaultFilteredGameType(results)
  const filtered = primaryGameType
    ? results.filter((r) => normalizeRowGameType(r) === primaryGameType)
    : []
  const sortedPrimary = [...filtered].sort(
    (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime(),
  )

  let runsRecorded = 0
  let bestScorePct: number | null = null
  let avgScorePct: number | null = null
  let last5AvgPct: number | null = null
  let last5SampleSize = 0

  if (sortedPrimary.length > 0) {
    runsRecorded = sortedPrimary.length
    const scores = sortedPrimary.map((r) => Number(r.global_score))
    bestScorePct = Math.round(Math.max(...scores) * 10) / 10
    avgScorePct = Math.round(mean(scores)! * 10) / 10
    const last5 = sortedPrimary.slice(0, 5)
    last5SampleSize = last5.length
    const last5Scores = last5.map((r) => Number(r.global_score))
    last5AvgPct = Math.round(mean(last5Scores)! * 10) / 10
  }

  const showTrendUp =
    last5SampleSize >= 2 &&
    avgScorePct != null &&
    last5AvgPct != null &&
    last5AvgPct > avgScorePct + 0.05

  const showTrendDown =
    last5SampleSize >= 2 &&
    avgScorePct != null &&
    last5AvgPct != null &&
    last5AvgPct < avgScorePct - 0.05

  const seaWolfRows = results.filter((r) => normalizeRowGameType(r) === "sea_wolf")
  const weakestPhase = weakestPhaseFromSeaWolfRuns(seaWolfRows)

  return {
    hasAnyRuns,
    lastRunGlobalScorePct,
    primaryGameType,
    runsRecorded,
    bestScorePct,
    avgScorePct,
    last5AvgPct,
    last5SampleSize,
    showTrendUp,
    showTrendDown,
    weakestPhase,
    checklistFirstRunDone: userProgress != null ? userProgress.has_completed_first_run : hasAnyRuns,
    checklistSolverUsed: userProgress?.has_used_solver ?? false,
    checklistAnalyticsReviewed: userProgress != null ? userProgress.has_reviewed_analytics : runsRecorded >= 3,
    checklistGuideRead: userProgress?.has_read_guide ?? false,
  }
}
