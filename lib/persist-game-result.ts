import type { GameScore } from "@/lib/game-scoring"

/** DB insert payload (snake_case) for `public.game_results`, excluding id, user_id, played_at. */
export type GameResultInsertPayload = {
  global_score: number
  time_taken: number
  phase1_avg: number
  phase2_avg: number
  phase0_avg: number
  phase3_avg: number
  phase4_avg: number
  site1_score: number | null
  site2_score: number | null
  site3_score: number | null
  site1_scenario: string | null
  site2_scenario: string | null
  site3_scenario: string | null
}

export function gameScoreToResultInsert(gameScore: GameScore): GameResultInsertPayload {
  const site = (i: number) => gameScore.sites[i]
  return {
    global_score: gameScore.globalAverage,
    time_taken: Math.max(0, Math.round(gameScore.totalTime)),
    phase1_avg: gameScore.perPhaseAverages.phase1,
    phase2_avg: gameScore.perPhaseAverages.phase2,
    phase0_avg: gameScore.perPhaseAverages.phase0,
    phase3_avg: gameScore.perPhaseAverages.phase3,
    phase4_avg: gameScore.perPhaseAverages.phase4,
    site1_score: gameScore.perSiteAverages[0] ?? null,
    site2_score: gameScore.perSiteAverages[1] ?? null,
    site3_score: gameScore.perSiteAverages[2] ?? null,
    site1_scenario: site(0)?.scenarioName ?? null,
    site2_scenario: site(1)?.scenarioName ?? null,
    site3_scenario: site(2)?.scenarioName ?? null,
  }
}
