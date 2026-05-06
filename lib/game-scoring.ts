/** McKinsey Seawolf simulator — normalized scoring helpers (phases + aggregates). */

export type Attribute = "Mobility" | "Agility" | "Size"
export type Trait = string

export type AttributeRange = { min: number; max: number }

export type SiteRequirements = {
  attributes: Record<Attribute, AttributeRange>
  desired_trait: Trait
  undesired_trait: Trait
}

export type SelectionItem = {
  type: "attribute" | "trait"
  name: string
  selectedMin?: number
  selectedMax?: number
}

export type Phase1Input = {
  playerSelection: SelectionItem[]
  scenario: SiteRequirements & { name: string }
}

export type Phase1Score = {
  raw: number
  percentage: number
  traitCorrect: boolean
  attributeCorrect: boolean
  optimalTrait: string
  optimalAttribute: string
  explanation: {
    trait: string
    attribute: string
  }
}

export type MicrobeDecision = {
  microbeId: string
  playerChoice: "site1" | "site2" | "return"
  correctChoice: "site1" | "site2" | "return"
}

export type Phase2Score = {
  raw: number
  percentage: number
  miscategorized: number
  decisions: MicrobeDecision[]
  explanation: {
    correct: string[]
    incorrect: {
      id: string
      playerChoice: string
      correctChoice: string
      reason: string
    }[]
  }
}

export type MicrobeClassification = "good" | "bad" | "neutral"

export type Phase0Decision = {
  microbeId: string
  microbeName: string
  playerChoice: "keep" | "return"
  classification: MicrobeClassification
  correct: boolean
  reason: string
}

export type Phase0Score = {
  n: number
  raw: number
  percentage: number
  decisions: Phase0Decision[]
}

export type CandidateClassification = "optimal" | "neutral" | "negative"

export type RoundResult = {
  round: number
  playerPickId: string
  playerPickClassification: CandidateClassification
  playerPickNeutralScore: number | null
  optimalId: string | null
  bestNeutralScore: number | null
  deduction: number
  maxDeduction: number
  isTrapRound: boolean
}

export type Phase3Candidate = {
  microbe: { id: string }
  classification: CandidateClassification
  neutral_score: number | null
  conditions_satisfied: number
}

export type Phase3Input = {
  chooseSets: {
    round: number
    isTrapRound: boolean
    candidates: Phase3Candidate[]
  }[]
  playerPickIds: string[]
  originalMaxScore: number
  playerPoolMaxScore: number
}

export type Phase3Score = {
  roundResults: RoundResult[]
  totalDeductions: number
  totalMaxDeductions: number
  poolQualityPenalty: number
  originalMaxScore: number
  playerPoolMaxScore: number
  raw: number
  percentage: number
}

export type ConditionResult = {
  mobilityInRange: boolean
  agilityInRange: boolean
  sizeInRange: boolean
  desiredTraitPresent: boolean
  undesiredTraitAbsent: boolean
}

export type Phase4MicrobeInput = {
  Mobility: number
  Agility: number
  Size: number
  trait: string
}

export type Phase4Score = {
  score: number
  percentage: number
  conditionResults: ConditionResult
  selectedMicrobes: Phase4MicrobeInput[] // aligns with scorer input; callers may widen to unknown[]
  optimalCombination: Phase4MicrobeInput[]
  optimalScore: number
}

export type SiteScore = {
  siteNumber: number
  scenarioName: string
  timeSpent: number
  phase1: Phase1Score
  phase2: Phase2Score
  phase0: Phase0Score | null
  phase3: Phase3Score
  phase4: Phase4Score
  siteAverage: number
}

export type GameScore = {
  sites: SiteScore[]
  totalTime: number
  globalAverage: number
  perPhaseAverages: {
    phase1: number
    phase2: number
    phase0: number
    phase3: number
    phase4: number
  }
  perSiteAverages: number[]
}

const ATTR_ORDER: Attribute[] = ["Mobility", "Agility", "Size"]

/** Phase 1 */
export function extremeness(min: number, max: number): number {
  return Math.abs((min + max) / 2 - 5.5)
}

export function scorePhase1(input: Phase1Input): Phase1Score {
  const { playerSelection, scenario } = input
  const desired = scenario.desired_trait

  let bestExt = -1
  const bestAttrs: Attribute[] = []
  for (const attr of ATTR_ORDER) {
    const { min: aMin, max: aMax } = scenario.attributes[attr]
    const e = extremeness(aMin, aMax)
    if (e > bestExt) {
      bestExt = e
      bestAttrs.length = 0
      bestAttrs.push(attr)
    } else if (e === bestExt) {
      bestAttrs.push(attr)
    }
  }

  const optimalTraitName = desired
  const tied = bestAttrs.length > 1
  const primaryOptimalAttr = bestAttrs[0]!
  const optimalAttributeLabel = bestAttrs.join(", ")

  const traitCorrect = playerSelection.some((it) => it.type === "trait" && it.name === desired)

  let attributeCorrect = false
  for (const pick of playerSelection) {
    if (
      pick.type === "attribute" &&
      bestAttrs.includes(pick.name as Attribute) &&
      pick.selectedMin === scenario.attributes[pick.name as Attribute].min
    ) {
      attributeCorrect = true
      break
    }
  }

  const raw = (traitCorrect ? 1 : 0) + (attributeCorrect ? 1 : 0)
  const percentage = (raw / 2) * 100

  const traitExplanation = traitCorrect
    ? `Correct — ${desired} is the desired trait`
    : `Incorrect — desired trait was ${desired}`

  let attributeExplanation: string
  if (attributeCorrect) {
    const picked = playerSelection.find(
      (it) =>
        it.type === "attribute" &&
        bestAttrs.includes(it.name as Attribute) &&
        it.selectedMin === scenario.attributes[it.name as Attribute].min,
    )
    const attrName = (picked?.name ?? primaryOptimalAttr) as Attribute
    const r = scenario.attributes[attrName]
    if (tied) {
      const others = bestAttrs.filter((a) => a !== attrName)
      attributeExplanation =
        others.length === 0
          ? `Correct — ${attrName} (${r.min}-${r.max}) is the most extreme attribute`
          : `Correct — ${attrName} is one of the most extreme attributes (tied with ${others.join(", ")})`
    } else {
      attributeExplanation = `Correct — ${attrName} (${r.min}-${r.max}) is the most extreme attribute`
    }
  } else {
    const a = primaryOptimalAttr
    const r = scenario.attributes[a]
    attributeExplanation = `Incorrect — most extreme attribute was ${a} (${r.min}-${r.max})`
  }

  return {
    raw,
    percentage,
    traitCorrect,
    attributeCorrect,
    optimalTrait: optimalTraitName,
    optimalAttribute: optimalAttributeLabel,
    explanation: { trait: traitExplanation, attribute: attributeExplanation },
  }
}

/** Phase 2 */
export type Phase2DecisionRow = {
  microbeId: string
  playerChoice: MicrobeDecision["playerChoice"]
  correctChoice: MicrobeDecision["correctChoice"]
  reason: string
}

export function scorePhase2(decisions: Phase2DecisionRow[]): Phase2Score {
  const miscategorized = decisions.filter((d) => d.playerChoice !== d.correctChoice).length
  const raw = 10 - miscategorized
  const percentage = (raw / 10) * 100

  const mapped: MicrobeDecision[] = decisions.map((d) => ({
    microbeId: d.microbeId,
    playerChoice: d.playerChoice,
    correctChoice: d.correctChoice,
  }))

  const correct: string[] = []
  const incorrect: Phase2Score["explanation"]["incorrect"] = []

  for (const d of decisions) {
    if (d.playerChoice === d.correctChoice) correct.push(d.microbeId)
    else
      incorrect.push({
        id: d.microbeId,
        playerChoice: d.playerChoice,
        correctChoice: d.correctChoice,
        reason: d.reason,
      })
  }

  return {
    raw,
    percentage,
    miscategorized,
    decisions: mapped,
    explanation: { correct, incorrect },
  }
}

/** Phase 0 */
export type MicrobeForClassification = {
  Mobility: number
  Agility: number
  Size: number
  trait: string
}

function inviableAttrs(m: MicrobeForClassification, req: SiteRequirements): Attribute[] {
  const out: Attribute[] = []
  for (const attr of ATTR_ORDER) {
    const v = m[attr]
    const { min, max } = req.attributes[attr]
    if (v + 10 + 10 < 3 * min || v + 1 + 1 > 3 * max) out.push(attr)
  }
  return out
}

function allOutsideRange(m: MicrobeForClassification, req: SiteRequirements): boolean {
  return ATTR_ORDER.every((attr) => {
    const v = m[attr]
    const { min, max } = req.attributes[attr]
    return v < min || v > max
  })
}

export function classifyMicrobe(
  microbe: MicrobeForClassification,
  req: SiteRequirements,
): { classification: MicrobeClassification; reason: string } {
  if (microbe.trait === req.undesired_trait) {
    return { classification: "bad", reason: `Has undesired trait (${microbe.trait})` }
  }

  const inv = inviableAttrs(microbe, req)
  if (inv.length > 0) {
    return { classification: "bad", reason: `Inviable on ${inv.join(", ")}` }
  }

  if (allOutsideRange(microbe, req)) {
    return { classification: "bad", reason: "All attributes outside range" }
  }

  const allIn = ATTR_ORDER.every((attr) => {
    const v = microbe[attr]
    const { min, max } = req.attributes[attr]
    return v >= min && v <= max
  })

  if (microbe.trait === req.desired_trait) {
    return { classification: "good", reason: `Has desired trait (${microbe.trait})` }
  }

  if (allIn) {
    return { classification: "good", reason: "All attributes within range" }
  }

  return { classification: "neutral", reason: "Partially matches site requirements" }
}

export type Phase0DecisionInput = {
  microbe: { id: string; name: string } & MicrobeForClassification
  playerChoice: "keep" | "return"
  siteRequirements: SiteRequirements
}

export function scorePhase0(decisions: Phase0DecisionInput[]): Phase0Score {
  const out: Phase0Decision[] = []
  let wrong = 0

  for (const d of decisions) {
    const { classification, reason } = classifyMicrobe(d.microbe, d.siteRequirements)
    const correct =
      classification === "neutral" ||
      (classification === "bad" && d.playerChoice === "return") ||
      (classification === "good" && d.playerChoice === "keep")

    if (!correct) wrong += 1

    out.push({
      microbeId: d.microbe.id,
      microbeName: d.microbe.name,
      playerChoice: d.playerChoice,
      classification,
      correct,
      reason,
    })
  }

  const n = decisions.length
  const raw = n - wrong
  const percentage = n === 0 ? 0 : (raw / n) * 100

  return { n, raw, percentage, decisions: out }
}

/** Phase 3 */
export function scorePhase3(input: Phase3Input): Phase3Score {
  const sortedSets = [...input.chooseSets].sort((a, b) => a.round - b.round)
  const roundResults: RoundResult[] = []

  for (let i = 0; i < sortedSets.length; i++) {
    const set = sortedSets[i]!
    const pickId = input.playerPickIds[i] ?? ""
    const picks = set.candidates
    const hasOptimal = picks.some((c) => c.classification === "optimal")

    const playerPick = picks.find((c) => c.microbe.id === pickId) ?? picks[0]!

    const pickClass = playerPick!.classification as CandidateClassification

    const hasNegative =
      picks.some((c) => c.microbe.id !== pickId && c.classification === "negative") ||
      pickClass === "negative"

    const maxDeduction = hasOptimal ? 3 : hasNegative ? 2 : 1

    let deduction = 0
    let bestNeutralScore: number | null = null
    let optimalId: string | null = null

    if (hasOptimal) optimalId = picks.find((c) => c.classification === "optimal")?.microbe.id ?? null

    if (hasOptimal) {
      if (pickClass === "optimal") deduction = 0
      else if (pickClass === "neutral") deduction = 2
      else deduction = 3 // negative or unknown bucket
    } else {
      if (pickClass === "negative") deduction = 2
      else if (pickClass === "neutral") {
        const neutrals = picks.filter((c) => c.classification === "neutral")
        const scores = neutrals.map((c) => c.neutral_score).filter((x): x is number => typeof x === "number")
        bestNeutralScore = scores.length ? Math.max(...scores) : null
        const pn = playerPick!.neutral_score
        if (pn != null && bestNeutralScore != null && pn === bestNeutralScore) deduction = 0
        else deduction = 1
      } else {
        // optimal classification but no optimal in pool — treat as neutral path or no loss
        deduction = 0
      }
    }

    roundResults.push({
      round: set.round,
      playerPickId: pickId,
      playerPickClassification: pickClass,
      playerPickNeutralScore: playerPick!.neutral_score,
      optimalId,
      bestNeutralScore,
      deduction,
      maxDeduction,
      isTrapRound: set.isTrapRound,
    })
  }

  const drop = input.originalMaxScore - input.playerPoolMaxScore
  const poolQualityPenalty = (drop / 20) * 3
  const totalRoundDeductions = roundResults.reduce((s, r) => s + r.deduction, 0)
  const totalDeductions = totalRoundDeductions + poolQualityPenalty
  const totalMaxDeductions = roundResults.reduce((s, r) => s + r.maxDeduction, 0)
  const raw = Math.max(0, totalMaxDeductions - totalDeductions)
  const percentage = totalMaxDeductions <= 0 ? 0 : (raw / totalMaxDeductions) * 100

  return {
    roundResults,
    totalDeductions,
    totalMaxDeductions,
    poolQualityPenalty,
    originalMaxScore: input.originalMaxScore,
    playerPoolMaxScore: input.playerPoolMaxScore,
    raw,
    percentage,
  }
}

/** Phase 4 */
function cloneMicrobes(list: Phase4MicrobeInput[]): Phase4MicrobeInput[] {
  return list.map((m) => ({ ...m }))
}

export function combinations3<T>(arr: T[]): T[][] {
  const out: T[][] = []
  const n = arr.length
  if (n < 3) return out
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) out.push([arr[i]!, arr[j]!, arr[k]!])
  return out
}

function scoreTripleConditions(
  selected: Phase4MicrobeInput[],
  req: SiteRequirements,
): { score: number; conditionResults: ConditionResult } {
  if (selected.length === 0) {
    return {
      score: 0,
      conditionResults: {
        mobilityInRange: false,
        agilityInRange: false,
        sizeInRange: false,
        desiredTraitPresent: false,
        undesiredTraitAbsent: true,
      },
    }
  }

  const n = selected.length
  const meanMob = selected.reduce((s, m) => s + m.Mobility, 0) / n
  const meanAg = selected.reduce((s, m) => s + m.Agility, 0) / n
  const meanSz = selected.reduce((s, m) => s + m.Size, 0) / n

  const mobilityInRange = meanMob >= req.attributes.Mobility.min && meanMob <= req.attributes.Mobility.max
  const agilityInRange = meanAg >= req.attributes.Agility.min && meanAg <= req.attributes.Agility.max
  const sizeInRange = meanSz >= req.attributes.Size.min && meanSz <= req.attributes.Size.max
  const desiredTraitPresent = selected.some((m) => m.trait === req.desired_trait)
  const undesiredTraitAbsent = !selected.some((m) => m.trait === req.undesired_trait)

  let score = 100
  if (!mobilityInRange) score -= 20
  if (!agilityInRange) score -= 20
  if (!sizeInRange) score -= 20
  if (!desiredTraitPresent) score -= 20
  if (!undesiredTraitAbsent) score -= 20

  return {
    score,
    conditionResults: {
      mobilityInRange,
      agilityInRange,
      sizeInRange,
      desiredTraitPresent,
      undesiredTraitAbsent,
    },
  }
}

export type Phase4Input = {
  selectedMicrobes: Phase4MicrobeInput[]
  allMicrobes: Phase4MicrobeInput[]
  req: SiteRequirements
}

export function scorePhase4(input: Phase4Input): Phase4Score {
  const selected = cloneMicrobes(input.selectedMicrobes)
  const { score, conditionResults } = scoreTripleConditions(selected, input.req)

  let optimalScore = -1
  let optimalCombination: Phase4MicrobeInput[] = []

  for (const trio of combinations3(input.allMicrobes)) {
    const sc = scoreTripleConditions(trio, input.req).score
    if (sc > optimalScore) {
      optimalScore = sc
      optimalCombination = cloneMicrobes(trio)
    }
  }

  if (optimalScore < 0) {
    optimalScore = 0
    optimalCombination = []
  }

  return {
    score,
    percentage: score,
    conditionResults,
    selectedMicrobes: selected,
    optimalCombination,
    optimalScore,
  }
}

/** Aggregates */

export function computeSiteAverage(site: Partial<SiteScore>): number {
  const pcts: number[] = []
  if (site.phase1?.percentage != null) pcts.push(site.phase1.percentage)
  if (site.phase2?.percentage != null) pcts.push(site.phase2.percentage)
  if (site.phase0?.percentage != null) pcts.push(site.phase0.percentage)
  if (site.phase3?.percentage != null) pcts.push(site.phase3.percentage)
  if (site.phase4?.percentage != null) pcts.push(site.phase4.percentage)
  if (pcts.length === 0) return 0
  return pcts.reduce((a, b) => a + b, 0) / pcts.length
}

export function computeGameScore(sites: SiteScore[], totalTime: number): GameScore {
  const perSiteAverages = sites.map((s) => s.siteAverage)
  const globalAverage =
    perSiteAverages.length === 0
      ? 0
      : perSiteAverages.reduce((a, b) => a + b, 0) / perSiteAverages.length

  const phase1Vals: number[] = []
  const phase2Vals: number[] = []
  const phase0Vals: number[] = []
  const phase3Vals: number[] = []
  const phase4Vals: number[] = []

  for (const s of sites) {
    phase1Vals.push(s.phase1.percentage)
    phase2Vals.push(s.phase2.percentage)
    if (s.phase0 != null) phase0Vals.push(s.phase0.percentage)
    phase3Vals.push(s.phase3.percentage)
    phase4Vals.push(s.phase4.percentage)
  }

  const avg = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length)

  return {
    sites,
    totalTime,
    globalAverage,
    perPhaseAverages: {
      phase1: avg(phase1Vals),
      phase2: avg(phase2Vals),
      phase0: avg(phase0Vals),
      phase3: avg(phase3Vals),
      phase4: avg(phase4Vals),
    },
    perSiteAverages,
  }
}
