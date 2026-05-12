import type { Phase4Score, SelectionItem as GSelectionItem, SiteRequirements as GSiteRequirements } from "@/lib/game-scoring"

// ─── shared types ─────────────────────────────────────────────────────────────

export type Microbe = {
  id: string
  name: string
  Mobility: number
  Agility: number
  Size: number
  trait: string
}

export type ScenarioRequirements = {
  id: number
  name: string
  attributes: {
    Mobility: { min: number; max: number }
    Agility: { min: number; max: number }
    Size: { min: number; max: number }
  }
  desired_trait: string
  undesired_trait: string
}

export type ScenariosFile = {
  traits: string[]
  attributes: string[]
  scenarios: ScenarioRequirements[]
}

export type CategorizationPool = {
  categorization_id: string
  site1_scenario: string
  site2_scenario: string
  site1_requirements: GSiteRequirements
  site2_requirements: GSiteRequirements
  revealed_characteristic: {
    type: "trait" | "attribute"
    name: string
    value: string | { min: number; max: number }
  }
  microbes: Microbe[]
  correct_categorization: {
    site1: { id: string; reason: string }[]
    site2: { id: string; reason: string }[]
    return: { id: string; reason: string }[]
  }
}

export type CatPoolsFile = Record<string, CategorizationPool[]>

export type ProspectRoundJson = {
  round: number
  is_trap_round: boolean
  candidates: {
    microbe: Microbe
    classification: "optimal" | "neutral" | "negative"
    neutral_score: number | null
    conditions_satisfied: number
  }[]
}

export type ProspectScenarioJson = {
  phase2_id: string
  source_pool_id: string
  scenario_name: string
  preloaded_microbes: Microbe[]
  choose_sets: ProspectRoundJson[]
  optimal_final_pool: Microbe[]
  optimal_max_score: number
  original_max_score: number
}

export type ProspectPoolsFile = Record<string, ProspectScenarioJson[]>

/** Categorization “Site N+1 insight” reveal (verbatim shape from simulator JSON). */
export type RevealedCharacteristic = {
  type: "trait" | "attribute"
  name: string
  value: string | { min: number; max: number }
}

export type GameStep =
  | "start"
  | "s1_phase1"
  | "s1_phase2"
  | "s1_phase3"
  | "s1_phase4"
  | "s2_phase0"
  | "s2_phase1"
  | "s2_phase2"
  | "s2_phase3"
  | "s2_phase4"
  | "s3_phase0"
  | "s3_phase1"
  | "s3_phase2"
  | "s3_phase3"
  | "s3_phase4"
  | "results"

export type GameConfig = {
  scenarios: [ScenarioRequirements, ScenarioRequirements, ScenarioRequirements]
  catPool12: CategorizationPool
  catPool23: CategorizationPool
  /** Phase 2 for site 3 — key "C__*" in JSON */
  catPoolSite3: CategorizationPool
  prospectA: ProspectScenarioJson
  prospectB: ProspectScenarioJson
  prospectC: ProspectScenarioJson
}

export type PartialSiteAccumulator = {
  siteNumber: 1 | 2 | 3
  scenarioName: string
  phase1Result: import("@/lib/game-scoring").Phase1Score | null
  phase1Selections: GSelectionItem[]
  phase2Result: import("@/lib/game-scoring").Phase2Score | null
  phase0Result: import("@/lib/game-scoring").Phase0Score | null
  phase3Result: import("@/lib/game-scoring").Phase3Score | null
  phase4Result: Phase4Score | null
  phase3Pool: Microbe[]
  phase3SvgMap: Map<string, number> | null
}

export const TIMER_START = 30 * 60

export const ATTR_NAMES = ["Mobility", "Agility", "Size"] as const

export const GRID_SLOTS = 10

export const TOTAL_P3_ROUNDS = 4
