import type { GameScore, Phase4Score } from "@/lib/game-scoring"
import type { GameResultGameType } from "@/lib/game-result-types"

/** DB insert payload (snake_case) for `public.game_results`, excluding id, user_id, played_at. */
export type GameResultInsertPayload = {
  game_type: GameResultGameType
  global_score: number
  time_taken: number
  phase1_avg: number | null
  phase2_avg: number | null
  phase0_avg: number | null
  phase3_avg: number | null
  phase4_avg: number | null
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
    game_type: "sea_wolf",
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

/**
 * Treatment simulator: single site, phase 4 only. Other phase/site columns are null.
 */
export function treatmentPhase4ToResultInsert(input: {
  phase4: Phase4Score
  scenarioDisplayName: string
  elapsedSeconds: number
}): GameResultInsertPayload {
  const pct = Math.round(Number(input.phase4.percentage))
  return {
    game_type: "treatment",
    global_score: pct,
    time_taken: Math.max(0, Math.round(input.elapsedSeconds)),
    phase1_avg: null,
    phase2_avg: null,
    phase0_avg: null,
    phase3_avg: null,
    phase4_avg: pct,
    site1_score: pct,
    site2_score: null,
    site3_score: null,
    site1_scenario: input.scenarioDisplayName,
    site2_scenario: null,
    site3_scenario: null,
  }
}
