import { describe, expect, test } from "vitest"
import {
  type Phase3Candidate,
  type Phase3Input,
  type Phase4MicrobeInput,
  type SiteRequirements,
  classifyMicrobe,
  combinations3,
  computeGameScore,
  computeSiteAverage,
  scorePhase0,
  scorePhase1,
  scorePhase2,
  scorePhase3,
  scorePhase4,
} from "./game-scoring"

const baseScenario: SiteRequirements & { name: string } = {
  name: "Test Site",
  attributes: {
    Mobility: { min: 2, max: 4 },
    Agility: { min: 5, max: 7 },
    Size: { min: 3, max: 5 },
  },
  desired_trait: "Biofilm-forming",
  undesired_trait: "Thermophilic",
}

describe("scorePhase1", () => {
  test("correct trait + correct extreme attribute at right position → raw 2, 100%", () => {
    const s = scorePhase1({
      playerSelection: [
        { type: "trait", name: "Biofilm-forming" },
        { type: "attribute", name: "Mobility", selectedMin: 2, selectedMax: 4 },
      ],
      scenario: baseScenario,
    })
    expect(s.raw).toBe(2)
    expect(s.percentage).toBe(100)
    expect(s.traitCorrect).toBe(true)
    expect(s.attributeCorrect).toBe(true)
  })

  test("correct trait + wrong attribute → raw 1, 50%", () => {
    const s = scorePhase1({
      playerSelection: [
        { type: "trait", name: "Biofilm-forming" },
        { type: "attribute", name: "Agility", selectedMin: 5, selectedMax: 7 },
      ],
      scenario: baseScenario,
    })
    expect(s.raw).toBe(1)
    expect(s.percentage).toBe(50)
  })

  test("correct trait + correct attribute but wrong slider position → raw 1, 50%", () => {
    const s = scorePhase1({
      playerSelection: [
        { type: "trait", name: "Biofilm-forming" },
        { type: "attribute", name: "Mobility", selectedMin: 3, selectedMax: 5 },
      ],
      scenario: baseScenario,
    })
    expect(s.raw).toBe(1)
    expect(s.percentage).toBe(50)
  })

  test("wrong trait + correct attribute → raw 1, 50%", () => {
    const s = scorePhase1({
      playerSelection: [
        { type: "trait", name: "Thermophilic" },
        { type: "attribute", name: "Mobility", selectedMin: 2, selectedMax: 4 },
      ],
      scenario: baseScenario,
    })
    expect(s.raw).toBe(1)
    expect(s.percentage).toBe(50)
  })

  test("wrong trait + wrong attribute → raw 0, 0%", () => {
    const s = scorePhase1({
      playerSelection: [
        { type: "trait", name: "Thermophilic" },
        { type: "attribute", name: "Agility", selectedMin: 5, selectedMax: 7 },
      ],
      scenario: baseScenario,
    })
    expect(s.raw).toBe(0)
    expect(s.percentage).toBe(0)
  })

  test("two attributes (no trait) + one is correct extreme → raw 1, 50%", () => {
    const s = scorePhase1({
      playerSelection: [
        { type: "attribute", name: "Mobility", selectedMin: 2, selectedMax: 4 },
        { type: "attribute", name: "Agility", selectedMin: 5, selectedMax: 7 },
      ],
      scenario: baseScenario,
    })
    expect(s.raw).toBe(1)
    expect(s.percentage).toBe(50)
  })

  test("tied extreme attributes — either correct → raw 2, 100%", () => {
    const scenario: SiteRequirements & { name: string } = {
      name: "Tie",
      attributes: {
        Mobility: { min: 1, max: 3 },
        Agility: { min: 5, max: 5 },
        Size: { min: 8, max: 10 },
      },
      desired_trait: "Biofilm-forming",
      undesired_trait: "Thermophilic",
    }
    const m = scorePhase1({
      playerSelection: [
        { type: "trait", name: "Biofilm-forming" },
        { type: "attribute", name: "Mobility", selectedMin: 1, selectedMax: 3 },
      ],
      scenario,
    })
    const z = scorePhase1({
      playerSelection: [
        { type: "trait", name: "Biofilm-forming" },
        { type: "attribute", name: "Size", selectedMin: 8, selectedMax: 10 },
      ],
      scenario,
    })
    expect(m.raw).toBe(2)
    expect(z.raw).toBe(2)
  })

  test("all mid-range attributes — any attribute chosen scores the point", () => {
    const scenario: SiteRequirements & { name: string } = {
      name: "Flat",
      attributes: {
        Mobility: { min: 4, max: 7 },
        Agility: { min: 4, max: 7 },
        Size: { min: 4, max: 7 },
      },
      desired_trait: "Biofilm-forming",
      undesired_trait: "Thermophilic",
    }
    const s = scorePhase1({
      playerSelection: [
        { type: "trait", name: "Biofilm-forming" },
        { type: "attribute", name: "Size", selectedMin: 4, selectedMax: 6 },
      ],
      scenario,
    })
    expect(s.raw).toBe(2)
    expect(s.percentage).toBe(100)
  })
})

function makePhase2Row(
  i: number,
  player: "site1" | "site2" | "return",
  correct: "site1" | "site2" | "return",
) {
  return {
    microbeId: `m${i}`,
    playerChoice: player,
    correctChoice: correct,
    reason: "r",
  }
}

describe("scorePhase2", () => {
  test("all 10 correct → raw 10, 100%", () => {
    const decisions = Array.from({ length: 10 }, (_, i) => makePhase2Row(i, "site1", "site1"))
    const s = scorePhase2(decisions)
    expect(s.raw).toBe(10)
    expect(s.percentage).toBe(100)
    expect(s.miscategorized).toBe(0)
  })

  test("3 miscategorized → raw 7, 70%", () => {
    const decisions = [
      ...Array.from({ length: 7 }, (_, i) => makePhase2Row(i, "return", "return")),
      makePhase2Row(7, "site1", "site2"),
      makePhase2Row(8, "site2", "site1"),
      makePhase2Row(9, "return", "site1"),
    ]
    const s = scorePhase2(decisions)
    expect(s.miscategorized).toBe(3)
    expect(s.raw).toBe(7)
    expect(s.percentage).toBe(70)
  })

  test("all wrong → raw 0, 0%", () => {
    const decisions = Array.from({ length: 10 }, (_, i) =>
      makePhase2Row(i, "site1", "site2"),
    )
    const s = scorePhase2(decisions)
    expect(s.raw).toBe(0)
    expect(s.percentage).toBe(0)
    expect(s.miscategorized).toBe(10)
  })
})

const phase0Req: SiteRequirements = {
  attributes: {
    Mobility: { min: 4, max: 6 },
    Agility: { min: 4, max: 6 },
    Size: { min: 4, max: 6 },
  },
  desired_trait: "Biofilm-forming",
  undesired_trait: "Thermophilic",
}

function microbe(id: string, name: string, m: Partial<Phase4MicrobeInput> & Pick<Phase4MicrobeInput, "trait">) {
  return {
    id,
    name,
    Mobility: m.Mobility ?? 5,
    Agility: m.Agility ?? 5,
    Size: m.Size ?? 5,
    trait: m.trait,
  }
}

describe("classifyMicrobe / scorePhase0", () => {
  test("bad microbe returned → correct", () => {
    const m = microbe("1", "A", { trait: "Thermophilic" })
    const s = scorePhase0([{ microbe: m, playerChoice: "return", siteRequirements: phase0Req }])
    expect(s.decisions[0]!.classification).toBe("bad")
    expect(s.decisions[0]!.correct).toBe(true)
  })

  test("bad microbe kept → incorrect", () => {
    const m = microbe("1", "A", { trait: "Thermophilic" })
    const s = scorePhase0([{ microbe: m, playerChoice: "keep", siteRequirements: phase0Req }])
    expect(s.decisions[0]!.correct).toBe(false)
  })

  test("good microbe kept → correct", () => {
    const m = microbe("1", "A", { trait: "Biofilm-forming", Mobility: 5, Agility: 5, Size: 5 })
    const s = scorePhase0([{ microbe: m, playerChoice: "keep", siteRequirements: phase0Req }])
    expect(s.decisions[0]!.classification).toBe("good")
    expect(s.decisions[0]!.correct).toBe(true)
  })

  test("good microbe returned → incorrect", () => {
    const m = microbe("1", "A", { trait: "Biofilm-forming" })
    const s = scorePhase0([{ microbe: m, playerChoice: "return", siteRequirements: phase0Req }])
    expect(s.decisions[0]!.classification).toBe("good")
    expect(s.decisions[0]!.correct).toBe(false)
  })

  test("neutral microbe kept → correct", () => {
    const m = microbe("1", "A", {
      trait: "Metal-tolerant",
      Mobility: 5,
      Agility: 2,
      Size: 5,
    })
    expect(classifyMicrobe(m, phase0Req).classification).toBe("neutral")
    const s = scorePhase0([{ microbe: m, playerChoice: "keep", siteRequirements: phase0Req }])
    expect(s.decisions[0]!.correct).toBe(true)
  })

  test("neutral microbe returned → correct", () => {
    const m = microbe("1", "A", {
      trait: "Metal-tolerant",
      Mobility: 5,
      Agility: 2,
      Size: 5,
    })
    const s = scorePhase0([{ microbe: m, playerChoice: "return", siteRequirements: phase0Req }])
    expect(s.decisions[0]!.correct).toBe(true)
  })

  test("mixed 4 microbes, 2 wrong → raw 2, 50%", () => {
    const bad = microbe("b", "B", { trait: "Thermophilic" })
    const good = microbe("g", "G", { trait: "Biofilm-forming" })
    const n = microbe("n", "N", { trait: "Metal-tolerant", Agility: 2 })
    const s = scorePhase0([
      { microbe: bad, playerChoice: "return", siteRequirements: phase0Req }, // correct
      { microbe: bad, playerChoice: "keep", siteRequirements: phase0Req }, // wrong
      { microbe: good, playerChoice: "keep", siteRequirements: phase0Req }, // correct
      { microbe: good, playerChoice: "return", siteRequirements: phase0Req }, // wrong
    ])
    expect(s.n).toBe(4)
    expect(s.raw).toBe(2)
    expect(s.percentage).toBe(50)
  })

  test("undesired trait → classified bad", () => {
    const r = classifyMicrobe(
      microbe("1", "x", { trait: "Thermophilic" }),
      phase0Req,
    )
    expect(r.classification).toBe("bad")
    expect(r.reason).toContain("undesired trait")
  })

  test("inviable → classified bad", () => {
    const hiMin: SiteRequirements = {
      attributes: {
        Mobility: { min: 12, max: 14 },
        Agility: { min: 4, max: 6 },
        Size: { min: 4, max: 6 },
      },
      desired_trait: "Biofilm-forming",
      undesired_trait: "Thermophilic",
    }
    const m = microbe("1", "x", { trait: "Metal-tolerant", Mobility: 5 })
    const r = classifyMicrobe(m, hiMin)
    expect(r.classification).toBe("bad")
    expect(r.reason).toContain("Inviable")
  })

  test("all attributes outside range → classified bad", () => {
    const m = microbe("1", "x", { trait: "Metal-tolerant", Mobility: 1, Agility: 1, Size: 1 })
    const r = classifyMicrobe(m, phase0Req)
    expect(r.classification).toBe("bad")
    expect(r.reason).toContain("All attributes outside range")
  })

  test("desired trait → classified good", () => {
    // Desired trait, not all outside range, not inviable on any attribute.
    const m = microbe("1", "x", { trait: "Biofilm-forming", Mobility: 5, Agility: 5, Size: 7 })
    const r = classifyMicrobe(m, phase0Req)
    expect(r.classification).toBe("good")
    expect(r.reason).toContain("desired trait")
  })

  test("all attributes in range → classified good", () => {
    const m = microbe("1", "x", { trait: "Metal-tolerant", Mobility: 5, Agility: 5, Size: 5 })
    const r = classifyMicrobe(m, phase0Req)
    expect(r.classification).toBe("good")
    expect(r.reason).toContain("within range")
  })
})

function cand(
  id: string,
  cls: "optimal" | "neutral" | "negative",
  neutral: number | null,
): Phase3Candidate {
  return {
    microbe: { id },
    classification: cls,
    neutral_score: neutral,
    conditions_satisfied: 0,
  }
}

describe("scorePhase3", () => {
  test("all optimal picks + no pool drop → 100%", () => {
    const input: Phase3Input = {
      chooseSets: [
        {
          round: 1,
          isTrapRound: false,
          candidates: [cand("o1", "optimal", null), cand("n1", "neutral", 5)],
        },
      ],
      playerPickIds: ["o1"],
      originalMaxScore: 100,
      playerPoolMaxScore: 100,
    }
    const s = scorePhase3(input)
    expect(s.roundResults[0]!.deduction).toBe(0)
    expect(s.poolQualityPenalty).toBe(0)
    expect(s.totalMaxDeductions).toBe(3)
    expect(s.raw).toBe(3)
    expect(s.percentage).toBe(100)
  })

  test("picked neutral when optimal available → deduct 2", () => {
    const s = scorePhase3({
      chooseSets: [
        {
          round: 1,
          isTrapRound: false,
          candidates: [cand("o1", "optimal", null), cand("nx", "neutral", 10)],
        },
      ],
      playerPickIds: ["nx"],
      originalMaxScore: 100,
      playerPoolMaxScore: 100,
    })
    expect(s.roundResults[0]!.deduction).toBe(2)
  })

  test("picked negative when optimal available → deduct 3", () => {
    const s = scorePhase3({
      chooseSets: [
        {
          round: 1,
          isTrapRound: false,
          candidates: [cand("o1", "optimal", null), cand("bad", "negative", null)],
        },
      ],
      playerPickIds: ["bad"],
      originalMaxScore: 50,
      playerPoolMaxScore: 50,
    })
    expect(s.roundResults[0]!.deduction).toBe(3)
  })

  test("no optimal, picked best neutral → deduct 0", () => {
    const s = scorePhase3({
      chooseSets: [
        {
          round: 1,
          isTrapRound: false,
          candidates: [
            cand("a", "neutral", 8),
            cand("b", "neutral", 3),
          ],
        },
      ],
      playerPickIds: ["a"],
      originalMaxScore: 50,
      playerPoolMaxScore: 50,
    })
    expect(s.roundResults[0]!.deduction).toBe(0)
    expect(s.roundResults[0]!.maxDeduction).toBe(1)
  })

  test("no optimal, picked worse neutral → deduct 1", () => {
    const s = scorePhase3({
      chooseSets: [
        {
          round: 1,
          isTrapRound: false,
          candidates: [
            cand("best", "neutral", 9),
            cand("worst", "neutral", 2),
          ],
        },
      ],
      playerPickIds: ["worst"],
      originalMaxScore: 40,
      playerPoolMaxScore: 40,
    })
    expect(s.roundResults[0]!.deduction).toBe(1)
  })

  test("no optimal, picked negative → deduct 2", () => {
    const s = scorePhase3({
      chooseSets: [
        {
          round: 1,
          isTrapRound: false,
          candidates: [cand("neu", "neutral", 5), cand("bad", "negative", null)],
        },
      ],
      playerPickIds: ["bad"],
      originalMaxScore: 40,
      playerPoolMaxScore: 40,
    })
    expect(s.roundResults[0]!.deduction).toBe(2)
    expect(s.roundResults[0]!.maxDeduction).toBe(2)
  })

  test("pool drops 20 points → penalty 3", () => {
    const s = scorePhase3({
      chooseSets: [
        {
          round: 1,
          isTrapRound: false,
          candidates: [cand("o", "optimal", null)],
        },
      ],
      playerPickIds: ["o"],
      originalMaxScore: 100,
      playerPoolMaxScore: 80,
    })
    expect(s.poolQualityPenalty).toBe(3)
  })

  test("pool drops 40 points → penalty 6", () => {
    const s = scorePhase3({
      chooseSets: [
        {
          round: 1,
          isTrapRound: false,
          candidates: [cand("o", "optimal", null)],
        },
      ],
      playerPickIds: ["o"],
      originalMaxScore: 100,
      playerPoolMaxScore: 60,
    })
    expect(s.poolQualityPenalty).toBe(6)
  })

  test("mixed rounds + pool drop → correct total", () => {
    const input: Phase3Input = {
      chooseSets: [
        {
          round: 1,
          isTrapRound: false,
          candidates: [cand("op", "optimal", null), cand("n", "neutral", 5)],
        },
        {
          round: 2,
          isTrapRound: false,
          candidates: [cand("x", "neutral", 10), cand("y", "neutral", 4)],
        },
      ],
      playerPickIds: ["op", "x"],
      originalMaxScore: 100,
      playerPoolMaxScore: 90,
    }
    const s = scorePhase3(input)
    expect(s.poolQualityPenalty).toBeCloseTo(1.5)
    expect(s.roundResults[0]!.deduction).toBe(0)
    expect(s.roundResults[1]!.deduction).toBe(0)
    expect(s.totalMaxDeductions).toBe(4)
    expect(s.totalDeductions).toBeCloseTo(1.5)
    expect(s.raw).toBeCloseTo(2.5)
    expect(s.percentage).toBeCloseTo((2.5 / 4) * 100)
  })
})

describe("scorePhase4", () => {
  const req: SiteRequirements = {
    attributes: {
      Mobility: { min: 4, max: 6 },
      Agility: { min: 4, max: 6 },
      Size: { min: 4, max: 6 },
    },
    desired_trait: "Biofilm-forming",
    undesired_trait: "Thermophilic",
  }

  const m = (trait: string, Mob = 5, Ag = 5, Sz = 5): Phase4MicrobeInput => ({
    Mobility: Mob,
    Agility: Ag,
    Size: Sz,
    trait,
  })

  test("all 5 conditions met → 100", () => {
    const selected = [
      m("Biofilm-forming"),
      m("Biofilm-forming"),
      m("Biofilm-forming"),
    ]
    const s = scorePhase4({
      selectedMicrobes: selected,
      allMicrobes: selected,
      req,
    })
    expect(s.score).toBe(100)
    expect(s.percentage).toBe(100)
    expect(s.conditionResults.mobilityInRange).toBe(true)
    expect(s.conditionResults.agilityInRange).toBe(true)
    expect(s.conditionResults.sizeInRange).toBe(true)
    expect(s.conditionResults.desiredTraitPresent).toBe(true)
    expect(s.conditionResults.undesiredTraitAbsent).toBe(true)
  })

  test("one attribute mean out of range → 80", () => {
    const selected = [
      m("Biofilm-forming"),
      m("Biofilm-forming", 100, 6, 6),
      m("Biofilm-forming", 4, 6, 6),
    ]
    const s = scorePhase4({ selectedMicrobes: selected, allMicrobes: selected, req })
    expect(s.score).toBe(80)
    expect(s.conditionResults.mobilityInRange).toBe(false)
  })

  test("missing desired trait → 80", () => {
    const selected = [m("Metal-tolerant"), m("Metal-tolerant"), m("Metal-tolerant")]
    const s = scorePhase4({ selectedMicrobes: selected, allMicrobes: selected, req })
    expect(s.score).toBe(80)
    expect(s.conditionResults.desiredTraitPresent).toBe(false)
  })

  test("has undesired trait → 80", () => {
    const selected = [
      m("Biofilm-forming"),
      m("Biofilm-forming"),
      m("Thermophilic"),
    ]
    const s = scorePhase4({ selectedMicrobes: selected, allMicrobes: selected, req })
    expect(s.score).toBe(80)
    expect(s.conditionResults.undesiredTraitAbsent).toBe(false)
  })

  test("two attributes out + missing trait → 40", () => {
    const selected = [
      m("Metal-tolerant", 1, 1, 6),
      m("Metal-tolerant", 1, 1, 6),
      m("Metal-tolerant", 6, 6, 6),
    ]
    const s = scorePhase4({ selectedMicrobes: selected, allMicrobes: selected, req })
    expect(s.score).toBe(40)
  })

  test("all conditions failed → 0", () => {
    const selected = [
      m("Thermophilic", 1, 1, 1),
      m("Thermophilic", 1, 1, 1),
      m("Thermophilic", 100, 100, 100),
    ]
    const s = scorePhase4({ selectedMicrobes: selected, allMicrobes: selected, req })
    expect(s.score).toBe(0)
  })
})

describe("combinations3", () => {
  test("C(n,3) length", () => {
    expect(combinations3([1, 2, 3]).length).toBe(1)
    expect(combinations3([1, 2, 3, 4]).length).toBe(4)
  })
})

describe("aggregates", () => {
  test("computeSiteAverage uses non-null phase percentages", () => {
    const p1 = scorePhase1({
      playerSelection: [
        { type: "trait", name: baseScenario.desired_trait },
        { type: "attribute", name: "Mobility", selectedMin: 2, selectedMax: 4 },
      ],
      scenario: baseScenario,
    })
    const p2 = scorePhase2(Array.from({ length: 10 }, (_, i) => makePhase2Row(i, "site1", "site1")))
    const p4 = scorePhase4({
      selectedMicrobes: [
        { Mobility: 5, Agility: 5, Size: 5, trait: "Biofilm-forming" },
        { Mobility: 5, Agility: 5, Size: 5, trait: "Biofilm-forming" },
        { Mobility: 5, Agility: 5, Size: 5, trait: "Biofilm-forming" },
      ],
      allMicrobes: [],
      req: phase0Req,
    })
    const p3 = scorePhase3({
      chooseSets: [
        {
          round: 1,
          isTrapRound: false,
          candidates: [cand("o", "optimal", null)],
        },
      ],
      playerPickIds: ["o"],
      originalMaxScore: 100,
      playerPoolMaxScore: 100,
    })
    const avg = computeSiteAverage({ phase1: p1, phase2: p2, phase3: p3, phase4: p4 })
    expect(avg).toBe((p1.percentage + p2.percentage + p3.percentage + p4.percentage) / 4)
  })

  test("computeGameScore", () => {
    const dummySite = (): SiteRequirements => ({
      attributes: {
        Mobility: { min: 2, max: 4 },
        Agility: { min: 5, max: 7 },
        Size: { min: 3, max: 5 },
      },
      desired_trait: "Biofilm-forming",
      undesired_trait: "Thermophilic",
    })
    const sReq = dummySite()
    const site = (avg: number): import("./game-scoring").SiteScore => ({
      siteNumber: 1,
      scenarioName: "x",
      timeSpent: 100,
      siteAverage: avg,
      phase1: scorePhase1({
        playerSelection: [{ type: "trait", name: "Biofilm-forming" }],
        scenario: { ...sReq, name: "x" },
      }),
      phase2: scorePhase2(Array.from({ length: 10 }, (_, i) => makePhase2Row(i, "return", "return"))),
      phase0: scorePhase0([]),
      phase3: scorePhase3({
        chooseSets: [{ round: 1, isTrapRound: false, candidates: [cand("o", "optimal", null)] }],
        playerPickIds: ["o"],
        originalMaxScore: 100,
        playerPoolMaxScore: 100,
      }),
      phase4: scorePhase4({
        selectedMicrobes: [],
        allMicrobes: [],
        req: sReq,
      }),
    })
    const a = computeGameScore([site(50), site(70)], 200)
    expect(a.globalAverage).toBe(60)
    expect(a.perSiteAverages).toEqual([50, 70])
    expect(a.sites.length).toBe(2)
  })
})
