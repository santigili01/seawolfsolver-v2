/** Values stored in `public.game_results.game_type`. */
export const GAME_RESULT_GAME_TYPES = ["sea_wolf", "treatment", "redrock"] as const
export type GameResultGameType = (typeof GAME_RESULT_GAME_TYPES)[number]

export const gameResultGameTypeLabels: Record<GameResultGameType, string> = {
  sea_wolf: "Sea Wolf - Full Game",
  treatment: "Sea Wolf — treatment",
  redrock: "Redrock",
}

/** Row shape for `public.game_results` (Supabase). */
export type GameResultRow = {
  id: string
  user_id: string
  played_at: string
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
