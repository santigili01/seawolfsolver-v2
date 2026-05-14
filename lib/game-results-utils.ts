import {
  GAME_RESULT_GAME_TYPES,
  type GameResultGameType,
  type GameResultRow,
} from "@/lib/game-result-types"

const VALID_GAME_TYPES = new Set<string>(GAME_RESULT_GAME_TYPES)

/** Rows from older API responses may omit `game_type`; treat as full Sea Wolf. */
export function normalizeRowGameType(r: GameResultRow): GameResultGameType {
  const t = r.game_type as string | undefined
  if (t && VALID_GAME_TYPES.has(t)) return t as GameResultGameType
  return "sea_wolf"
}

/** Same default as analytics: first game type (in enum order) that has any runs. */
export function pickDefaultFilteredGameType(results: GameResultRow[]): GameResultGameType | null {
  for (const t of GAME_RESULT_GAME_TYPES) {
    if (results.some((r) => normalizeRowGameType(r) === t)) return t
  }
  return null
}
