/** Row shape for `public.game_results` (Supabase). */
export type GameResultRow = {
  id: string
  user_id: string
  played_at: string
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
