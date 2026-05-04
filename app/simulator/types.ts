export type Microbe = {
  id: string
  name: string
  Mobility: number
  Agility: number
  Size: number
  trait: string
}

export type Pool = {
  pool_id: string
  max_score: number
  difficulty: string
  microbes: Microbe[]
  best_combinations: string[][]
}

export type ScenarioData = {
  [scenarioName: string]: {
    easy: Pool[]
    medium: Pool[]
    hard: Pool[]
    very_hard: Pool[]
  }
}

export type GameResult = {
  selectedMicrobes: Microbe[]
  optimalCombos: Microbe[][]
  playerScore: number
  maxScore: number
  scenarioName: string
  conditionResults: [boolean, boolean, boolean, boolean, boolean]
  timeSpent: number
}

export type ScenarioAttributeRanges = {
  Mobility: { min: number; max: number }
  Agility: { min: number; max: number }
  Size: { min: number; max: number }
}

/** One scenario entry from `public/scenarios.json` — used for scoring and UI after matching pool by `name`. */
export type ScenarioRequirements = {
  id: number
  name: string
  difficulty: string
  attributes: ScenarioAttributeRanges
  desired_trait: string
  undesired_trait: string
}

/** Root shape of `public/scenarios.json`. */
export type ScenariosFile = {
  traits: string[]
  attributes: string[]
  scenarios: ScenarioRequirements[]
}
