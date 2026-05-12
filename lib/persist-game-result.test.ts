import { describe, expect, it } from "vitest"
import type { GameScore, Phase1Score, Phase2Score, Phase3Score, Phase4Score } from "./game-scoring"
import { gameScoreToResultInsert, treatmentPhase4ToResultInsert } from "./persist-game-result"

const p1: Phase1Score = {
  raw: 2,
  percentage: 80,
  traitCorrect: true,
  attributeCorrect: true,
  optimalTrait: "T",
  optimalAttribute: "Mobility",
  explanation: { trait: "", attribute: "" },
}

const p2: Phase2Score = {
  raw: 10,
  percentage: 70,
  miscategorized: 0,
  decisions: [],
  explanation: { correct: [], incorrect: [] },
}

const p3: Phase3Score = {
  roundResults: [],
  totalDeductions: 0,
  totalMaxDeductions: 0,
  poolQualityPenalty: 0,
  originalMaxScore: 100,
  playerPoolMaxScore: 90,
  raw: 8,
  percentage: 60,
}

const p4: Phase4Score = {
  percentage: 90,
  score: 90,
  conditionResults: {
    mobilityInRange: true,
    agilityInRange: true,
    sizeInRange: true,
    desiredTraitPresent: true,
    undesiredTraitAbsent: true,
  },
  selectedMicrobes: [],
  optimalCombination: [],
  optimalScore: 100,
}

function minimalSite(n: number, scenarioName: string, siteAverage: number): GameScore["sites"][0] {
  return {
    siteNumber: n,
    scenarioName,
    timeSpent: 100,
    phase1: p1,
    phase2: p2,
    phase0: null,
    phase3: p3,
    phase4: p4,
    siteAverage,
  }
}

describe("gameScoreToResultInsert", () => {
  it("maps GameScore to insert payload", () => {
    const gameScore: GameScore = {
      sites: [minimalSite(1, "Alpha", 75), minimalSite(2, "Beta", 70), minimalSite(3, "Gamma", 72)],
      totalTime: 1800,
      globalAverage: 72.5,
      perPhaseAverages: { phase1: 80, phase2: 70, phase0: 0, phase3: 60, phase4: 90 },
      perSiteAverages: [75, 70, 72],
    }
    const row = gameScoreToResultInsert(gameScore)
    expect(row.game_type).toBe("sea_wolf")
    expect(row.global_score).toBe(72.5)
    expect(row.time_taken).toBe(1800)
    expect(row.site1_scenario).toBe("Alpha")
    expect(row.site2_score).toBe(70)
    expect(row.phase4_avg).toBe(90)
  })
})

describe("treatmentPhase4ToResultInsert", () => {
  it("maps phase-4-only run with nulls for other phases and sites 2–3", () => {
    const p4: Phase4Score = {
      percentage: 83.7,
      score: 84,
      conditionResults: {
        mobilityInRange: true,
        agilityInRange: true,
        sizeInRange: true,
        desiredTraitPresent: true,
        undesiredTraitAbsent: true,
      },
      selectedMicrobes: [],
      optimalCombination: [],
      optimalScore: 100,
    }
    const row = treatmentPhase4ToResultInsert({
      phase4: p4,
      scenarioDisplayName: "Test scenario",
      elapsedSeconds: 125,
    })
    expect(row.game_type).toBe("treatment")
    expect(row.global_score).toBe(84)
    expect(row.phase4_avg).toBe(84)
    expect(row.site1_score).toBe(84)
    expect(row.phase1_avg).toBeNull()
    expect(row.site2_score).toBeNull()
    expect(row.site3_scenario).toBeNull()
    expect(row.site1_scenario).toBe("Test scenario")
    expect(row.time_taken).toBe(125)
  })
})
