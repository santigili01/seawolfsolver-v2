import type { SelectionItem as GSelectionItem, SiteRequirements as GSiteRequirements } from "@/lib/game-scoring"
import {
  combinations3,
  computeGameScore,
  computeSiteAverage,
  scorePhase0,
  scorePhase1,
  scorePhase2,
  scorePhase3,
  scorePhase4,
  type GameScore,
  type Phase0DecisionInput,
  type Phase1Score,
  type Phase2DecisionRow,
  type Phase3Candidate,
  type Phase3Score,
  type Phase4MicrobeInput,
  type Phase4Score,
  type SiteScore,
} from "@/lib/game-scoring"
import { ATTR_NAMES, GRID_SLOTS } from "@/lib/game-types"
import type {
  CategorizationPool,
  CatPoolsFile,
  GameConfig,
  GameStep,
  Microbe,
  PartialSiteAccumulator,
  ProspectRoundJson,
  ProspectPoolsFile,
  ProspectScenarioJson,
  RevealedCharacteristic,
  ScenarioRequirements,
} from "@/lib/game-types"

/** Dev-only: skip buttons & fast-forward to results. Set `false` for production builds. */
export const DEV_MODE = true

export const DEV_SKIP_BTN_CLASS =
  "fixed bottom-20 left-4 z-50 rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white shadow-lg hover:bg-orange-600"

// ─── scenario selection ──────────────────────────────────────────────────────

export function randomPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

export function poolKey(a: string, b: string) {
  return `${a}__${b}`
}

export function pickScenarioChain(
  scenarios: ScenarioRequirements[],
  catPools: CatPoolsFile,
  prospectPools: ProspectPoolsFile,
): GameConfig | null {
  const byName = (n: string) => scenarios.find((s) => s.name === n)
  const traitsDiffer = (x: ScenarioRequirements, y: ScenarioRequirements) =>
    x.desired_trait !== y.desired_trait

  let attempts = 0
  while (attempts++ < 500) {
    const A = randomPick(scenarios)
    let pickedB: ScenarioRequirements | null = null

    innerB: for (let t = 0; t < 50; t++) {
      const B = randomPick(scenarios)
      if (B.name === A.name) continue
      if (!traitsDiffer(A, B)) continue
      const key = poolKey(A.name, B.name)
      if (!catPools[key]?.length) continue
      pickedB = B
      break innerB
    }
    if (!pickedB) continue

    let pickedC: ScenarioRequirements | null = null
    innerC: for (let t = 0; t < 50; t++) {
      const C = randomPick(scenarios)
      if (C.name === pickedB.name || C.name === A.name) continue
      if (!traitsDiffer(pickedB, C)) continue
      const key = poolKey(pickedB.name, C.name)
      if (!catPools[key]?.length) continue
      pickedC = C
      break innerC
    }
    if (!pickedC) continue

    const SA = byName(A.name)
    const SB = byName(pickedB.name)
    const SC = byName(pickedC.name)
    if (!SA || !SB || !SC) continue

    const cat12 = randomPick(catPools[poolKey(SA.name, SB.name)]!)
    const cat23 = randomPick(catPools[poolKey(SB.name, SC.name)]!)

    const keysFromC = Object.keys(catPools).filter(
      (k) => k.startsWith(`${SC.name}__`) && (catPools[k]?.length ?? 0) > 0,
    )
    if (!keysFromC.length) continue
    const cat3Key = randomPick(keysFromC)
    const catSite3 = randomPick(catPools[cat3Key]!)

    const pa = prospectPools[SA.name]
    const pb = prospectPools[SB.name]
    const pc = prospectPools[SC.name]
    if (!pa?.length || !pb?.length || !pc?.length) continue

    return {
      scenarios: [SA, SB, SC],
      catPool12: cat12,
      catPool23: cat23,
      catPoolSite3: catSite3,
      prospectA: randomPick(pa),
      prospectB: randomPick(pb),
      prospectC: randomPick(pc),
    }
  }

  return null
}

export function scenarioToSiteReq(s: ScenarioRequirements): GSiteRequirements {
  return {
    attributes: s.attributes,
    desired_trait: s.desired_trait,
    undesired_trait: s.undesired_trait,
  }
}

export function correctP2Choice(
  pool: CategorizationPool,
  id: string,
  isLastSite = false,
): "site1" | "site2" | "return" {
  if (pool.correct_categorization.site1.some((x) => x.id === id)) return "site1"
  if (pool.correct_categorization.site2.some((x) => x.id === id)) {
    return isLastSite ? "return" : "site2"
  }
  return "return"
}

export function correctP2Reason(pool: CategorizationPool, id: string, isLastSite = false): string {
  const all = [
    ...pool.correct_categorization.site1.map((x) => ({ ...x, c: "site1" as const })),
    ...pool.correct_categorization.site2.map((x) => ({
      ...x,
      c: isLastSite ? ("return" as const) : ("site2" as const),
    })),
    ...pool.correct_categorization.return.map((x) => ({ ...x, c: "return" as const })),
  ]
  return all.find((x) => x.id === id)?.reason ?? ""
}

export function devPhase2PerfectComplete(pool: CategorizationPool, isLastSite = false): {
  score: ReturnType<typeof scorePhase2>
  tagged: Microbe[]
  rows: Phase2DecisionRow[]
} {
  const rows: Phase2DecisionRow[] = pool.microbes.map((m) => {
    const c = correctP2Choice(pool, m.id, isLastSite)
    return { microbeId: m.id, playerChoice: c, correctChoice: c, reason: correctP2Reason(pool, m.id, isLastSite) }
  })
  const tagged = pool.microbes.filter((m) => correctP2Choice(pool, m.id, isLastSite) === "site2")
  return { score: scorePhase2(rows), tagged, rows }
}

export function devPhase0AllKeep(taggedMicrobes: Microbe[], scenario: ScenarioRequirements): ReturnType<typeof scorePhase0> {
  const req = scenarioToSiteReq(scenario)
  const inputs: Phase0DecisionInput[] = taggedMicrobes.map((m) => ({
    microbe: { ...m },
    playerChoice: "keep",
    siteRequirements: req,
  }))
  return scorePhase0(inputs)
}

export function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")} min`
}

export function formatMmSs(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

// ─── visuals (mirrors simulator/page.tsx essentials) ─────────────────────────

export function hashHue(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h) % 360
}

export function traitColor(trait: string) {
  switch (trait) {
    case "Thermophilic":
      return "#f97316"
    case "Metal-tolerant":
      return "#6366f1"
    case "Biofilm-forming":
      return "#10b981"
    case "Halophobic":
      return "#0ea5e9"
    default:
      return `hsl(${hashHue(trait)} 52% 40%)`
  }
}

export function traitChipBg(trait: string) {
  const c = traitColor(trait)
  return c.startsWith("#") ? `${c}22` : `color-mix(in srgb, ${c} 18%, transparent)`
}


export function getInviableAttributes(microbe: Microbe, req: ScenarioRequirements): string[] {
  const inviable: string[] = []
  const attrs = [
    { name: "Mobility" as const, value: microbe.Mobility, range: req.attributes.Mobility },
    { name: "Agility" as const, value: microbe.Agility, range: req.attributes.Agility },
    { name: "Size" as const, value: microbe.Size, range: req.attributes.Size },
  ]
  for (const attr of attrs) {
    const minSum = attr.value + 1 + 1
    const maxSum = attr.value + 10 + 10
    const requiredMin = attr.range.min * 3
    const requiredMax = attr.range.max * 3
    if (maxSum < requiredMin || minSum > requiredMax) {
      inviable.push(attr.name)
    }
  }
  return inviable
}

export function categorizeMicrobeForResults(microbe: Microbe, req: ScenarioRequirements) {
  const inviableAttributes = getInviableAttributes(microbe, req)
  const isInviable = inviableAttributes.length > 0
  const hasDesired = microbe.trait === req.desired_trait
  const hasUndesired = microbe.trait === req.undesired_trait

  if (isInviable || hasUndesired) {
    const reasons: string[] = []
    if (isInviable) {
      reasons.push(`Inviable on ${inviableAttributes.join(", ")} — cannot contribute to a valid combination`)
    }
    if (hasUndesired) {
      reasons.push(`Has undesired trait (${microbe.trait})`)
    }
    return {
      category: "negative" as const,
      reason: reasons.join(". "),
      inviableAttributes,
    }
  }

  if (hasDesired) {
    return {
      category: "positive" as const,
      reason: `Has desired trait (${microbe.trait})`,
      inviableAttributes: [] as string[],
    }
  }

  return {
    category: "neutral" as const,
    reason: "No desired or undesired trait, viable on all attributes",
    inviableAttributes: [] as string[],
  }
}

// Phase 1 range + ui (condensed from profiling page)
export function clampSliderStart(value: number) {
  return Math.min(8, Math.max(1, Math.round(value)))
}

export function selectionKey(type: "attribute" | "trait", name: string) {
  return `${type}:${name}`
}

export function formatInsightRevealLine(r: RevealedCharacteristic): string {
  if (r.type === "trait") return String(r.value)
  const v = r.value as { min: number; max: number }
  return `${r.name}: ${v.min}–${v.max}`
}

export function insightRevealTypeUpper(r: RevealedCharacteristic): string {
  return r.type === "trait" ? "TRAIT" : "ATTRIBUTE"
}

export function prospectToPhase3Input(
  scenarioJson: ProspectScenarioJson,
  pickIds: string[],
): Parameters<typeof scorePhase3>[0]["chooseSets"] {
  return scenarioJson.choose_sets.map((cs) => ({
    round: cs.round,
    isTrapRound: cs.is_trap_round,
    candidates: cs.candidates.map(
      (c): Phase3Candidate => ({
        microbe: { id: c.microbe.id },
        classification: c.classification,
        neutral_score: c.neutral_score,
        conditions_satisfied: c.conditions_satisfied,
      }),
    ),
  }))
}

export function devPhase1PerfectPicks(scenario: ScenarioRequirements): GSelectionItem[] {
  let bestExt = -1
  const bests: (typeof ATTR_NAMES)[number][] = []
  for (const attr of ATTR_NAMES) {
    const { min, max } = scenario.attributes[attr]
    const e = Math.abs((min + max) / 2 - 5.5)
    if (e > bestExt) {
      bestExt = e
      bests.length = 0
      bests.push(attr)
    } else if (e === bestExt) {
      bests.push(attr)
    }
  }
  const a = bests[0]!
  const r = scenario.attributes[a]
  return [
    { type: "trait", name: scenario.desired_trait },
    { type: "attribute", name: a, selectedMin: r.min, selectedMax: r.min + 2 },
  ]
}

/** Dev skip: desired trait + first ordered attribute at scenario min; if not a perfect Phase 1, falls back to `devPhase1PerfectPicks`. */
export function devPhase1SkipScoreAndPicks(scenario: ScenarioRequirements): { score: Phase1Score; picks: GSelectionItem[] } {
  const firstAttr = ATTR_NAMES[0]!
  let picks: GSelectionItem[] = [
    { type: "trait", name: scenario.desired_trait },
    {
      type: "attribute",
      name: firstAttr,
      selectedMin: scenario.attributes[firstAttr].min,
      selectedMax: scenario.attributes[firstAttr].min + 2,
    },
  ]
  let score = scorePhase1({
    playerSelection: picks,
    scenario: { ...scenarioToSiteReq(scenario), name: scenario.name },
  })
  if (score.raw !== 2) {
    picks = devPhase1PerfectPicks(scenario)
    score = scorePhase1({
      playerSelection: picks,
      scenario: { ...scenarioToSiteReq(scenario), name: scenario.name },
    })
  }
  return { score, picks }
}

export function devPhase3AutoPool(prospect: ProspectScenarioJson, scenario: ScenarioRequirements): { score: Phase3Score; pool: Microbe[] } {
  const pickIds = prospect.choose_sets.map((cs) => cs.candidates[0]!.microbe.id)
  const builtOrdered = [...prospect.preloaded_microbes]
  const reqPick = scenarioToSiteReq(scenario)
  for (let rIdx = 0; rIdx < pickIds.length; rIdx++) {
    const pid = pickIds[rIdx]
    const fromRound = prospect.choose_sets[rIdx]?.candidates.find((c) => c.microbe.id === pid)?.microbe
    if (fromRound) builtOrdered.push(fromRound)
  }
  const combos = combinations3([...builtOrdered] as Phase4MicrobeInput[])
  const playerPoolMaxScore =
    combos.length === 0
      ? prospect.optimal_max_score
      : Math.max(
          ...combos.map((trio) =>
            scorePhase4({
              selectedMicrobes: trio,
              allMicrobes: builtOrdered as Phase4MicrobeInput[],
              req: reqPick,
            }).score,
          ),
        )
  const score = scorePhase3({
    chooseSets: prospectToPhase3Input(prospect, pickIds),
    playerPickIds: pickIds,
    originalMaxScore: prospect.original_max_score,
    playerPoolMaxScore,
  })
  return { score, pool: builtOrdered }
}

export function devScoreAtPct75<T extends { percentage: number }>(s: T): T {
  return { ...s, percentage: 75 }
}

export function buildDevFinishedThreeSites(cfg: GameConfig): {
  finished: SiteScore[]
  pools: Microbe[][]
  p1Picks: GSelectionItem[][]
} {
  const sites: SiteScore[] = []
  const pools: Microbe[][] = []
  const p1Picks: GSelectionItem[][] = []

  const pack = (
    siteNumber: 1 | 2 | 3,
    scenario: ScenarioRequirements,
    catPool: CategorizationPool,
    prospect: ProspectScenarioJson,
    phase0Input: Phase0DecisionInput[] | null,
  ) => {
    const p1Sel = devPhase1PerfectPicks(scenario)
    const p1 = devScoreAtPct75(
      scorePhase1({
        playerSelection: p1Sel,
        scenario: { ...scenarioToSiteReq(scenario), name: scenario.name },
      }),
    )
    const p2rows: Phase2DecisionRow[] = catPool.microbes.map((m) => {
      const c = correctP2Choice(catPool, m.id)
      return { microbeId: m.id, playerChoice: c, correctChoice: c, reason: correctP2Reason(catPool, m.id) }
    })
    const p2 = devScoreAtPct75(scorePhase2(p2rows))
    const p0 = phase0Input ? devScoreAtPct75(scorePhase0(phase0Input)) : null
    const { score: p3, pool: p3pool } = devPhase3AutoPool(prospect, scenario)
    const p3s = devScoreAtPct75(p3)
    const trio = p3pool.slice(0, 3) as Microbe[]
    const p4raw = scorePhase4({
      selectedMicrobes: trio as Phase4MicrobeInput[],
      allMicrobes: p3pool.slice(0, GRID_SLOTS) as Phase4MicrobeInput[],
      req: scenarioToSiteReq(scenario),
    })
    const p4 = devScoreAtPct75(p4raw)
    const partial: Omit<SiteScore, "siteAverage"> = {
      siteNumber,
      scenarioName: scenario.name,
      timeSpent: 60,
      phase1: p1,
      phase2: p2,
      phase0: p0,
      phase3: p3s,
      phase4: p4,
    }
    sites.push({ ...partial, siteAverage: computeSiteAverage(partial) })
    pools.push(p3pool)
    p1Picks.push(p1Sel)
  }

  const tagged2 = cfg.catPool12.microbes.filter((m) => correctP2Choice(cfg.catPool12, m.id) === "site2")
  const p0s2: Phase0DecisionInput[] | null =
    tagged2.length === 0
      ? null
      : tagged2.map((m) => ({
          microbe: { ...m },
          playerChoice: "keep",
          siteRequirements: scenarioToSiteReq(cfg.scenarios[1]!),
        }))
  const tagged3 = cfg.catPool23.microbes.filter((m) => correctP2Choice(cfg.catPool23, m.id) === "site2")
  const p0s3: Phase0DecisionInput[] | null =
    tagged3.length === 0
      ? null
      : tagged3.map((m) => ({
          microbe: { ...m },
          playerChoice: "keep",
          siteRequirements: scenarioToSiteReq(cfg.scenarios[2]!),
        }))

  pack(1, cfg.scenarios[0]!, cfg.catPool12, cfg.prospectA, null)
  pack(2, cfg.scenarios[1]!, cfg.catPool23, cfg.prospectB, p0s2)
  pack(3, cfg.scenarios[2]!, cfg.catPoolSite3, cfg.prospectC, p0s3)

  return { finished: sites, pools, p1Picks: p1Picks }
}

export function phaseLabelFromStep(step: GameStep): string {
  if (step.includes("_phase1")) return "Phase 1: Profile"
  if (step.includes("_phase2")) return "Phase 2: Categorize"
  if (step.includes("_phase0")) return "Phase 0: Review"
  if (step.includes("_phase3")) return "Phase 3: Prospect Pool"
  if (step.includes("_phase4")) return "Phase 4: Treatment"
  return ""
}

export function siteHighlightFromStep(step: GameStep): 1 | 2 | 3 {
  if (step.startsWith("s2_")) return 2
  if (step.startsWith("s3_")) return 3
  return 1
}

export function microbeResultKey(m: Phase4MicrobeInput & { id?: string }) {
  if (m.id) return `id:${m.id}`
  return `v:${m.Mobility}-${m.Agility}-${m.Size}-${m.trait}`
}

export function buildGamePhase4Checklist(p4: Phase4Score, scenario: ScenarioRequirements) {
  const trio = p4.selectedMicrobes as Microbe[]
  const n = Math.max(1, trio.length)
  const means = {
    mobility: trio.reduce((s, m) => s + m.Mobility, 0) / n,
    agility: trio.reduce((s, m) => s + m.Agility, 0) / n,
    size: trio.reduce((s, m) => s + m.Size, 0) / n,
  }
  const req = scenario
  const cr = p4.conditionResults
  return [
    {
      label: "Mobility mean in range",
      pass: cr.mobilityInRange,
      detail: `Required: ${req.attributes.Mobility.min}–${req.attributes.Mobility.max} · Actual: ${means.mobility.toFixed(2)}`,
    },
    {
      label: "Agility mean in range",
      pass: cr.agilityInRange,
      detail: `Required: ${req.attributes.Agility.min}–${req.attributes.Agility.max} · Actual: ${means.agility.toFixed(2)}`,
    },
    {
      label: "Size mean in range",
      pass: cr.sizeInRange,
      detail: `Required: ${req.attributes.Size.min}–${req.attributes.Size.max} · Actual: ${means.size.toFixed(2)}`,
    },
    { label: `${req.desired_trait} present`, pass: cr.desiredTraitPresent },
    { label: `${req.undesired_trait} avoided`, pass: cr.undesiredTraitAbsent },
  ] as const
}

export function gameResultsScoreDisplayColorClass(score: number) {
  if (score >= 80) return "text-emerald-600"
  if (score >= 60) return "text-amber-600"
  return "text-red-600"
}

export function gameResultsOptimalScoreLineClass(score: number) {
  if (score >= 80) return "text-emerald-600 font-semibold"
  if (score >= 60) return "text-amber-600 font-semibold"
  return "text-red-600 font-semibold"
}

export function gameResultsScoreChipClass(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-800"
  if (score >= 60) return "bg-amber-100 text-amber-800"
  return "bg-red-100 text-red-800"
}

export function gameResultsBreakdownBorderClass(player: number, max: number) {
  if (player === max) return "border-l-emerald-500"
  if (player >= 60) return "border-l-amber-400"
  return "border-l-red-500"
}

export function phase2ChoiceLabel(choice: "site1" | "site2" | "return", siteNum: number) {
  if (choice === "site1") return `Site ${siteNum}`
  if (choice === "site2") return `Site ${siteNum + 1}`
  return "Return"
}

export function phase3RoundFeedback(
  rr: import("@/lib/game-scoring").RoundResult,
  chooseSet: ProspectRoundJson | null | undefined,
  req: ScenarioRequirements,
): string {
  if (!chooseSet) {
    if (rr.playerPickClassification === "optimal") return "Optimal pick — strongest candidate this round."
    if (rr.playerPickClassification === "negative") return "Negative pick — this microbe reduces your pool's ceiling."
    return "Neutral pick."
  }

  const playerCand = chooseSet.candidates.find((c) => c.microbe.id === rr.playerPickId)
  const optimalCand = chooseSet.candidates.find((c) => c.classification === "optimal")
  const attrs = ["Mobility", "Agility", "Size"] as const

  function whyNegative(m: Microbe): string {
    if (m.trait === req.undesired_trait) return `has the undesired trait (${m.trait})`
    const inviable = attrs.filter((a) => {
      const val = m[a]
      const minSum = val + 1 + 1
      const maxSum = val + 10 + 10
      return maxSum < req.attributes[a].min * 3 || minSum > req.attributes[a].max * 3
    })
    if (inviable.length > 0) return `is inviable on ${inviable.join(", ")}`
    return "does not contribute to a valid combination"
  }

  function attrsInRange(m: Microbe): string[] {
    return attrs.filter((a) => m[a] >= req.attributes[a].min && m[a] <= req.attributes[a].max)
  }

  if (rr.playerPickClassification === "optimal") {
    return `Optimal pick — ${playerCand?.microbe.name ?? "your pick"} was the best candidate (${playerCand?.conditions_satisfied ?? "?"} conditions satisfied).`
  }

  if (rr.playerPickClassification === "negative" && optimalCand) {
    const why = playerCand ? whyNegative(playerCand.microbe) : "it is a negative candidate"
    return `Bad pick — ${playerCand?.microbe.name ?? "your pick"} ${why}. ${optimalCand.microbe.name} was optimal (${optimalCand.conditions_satisfied} conditions satisfied), and missing it hurts your pool's achievable max score.`
  }

  if (rr.playerPickClassification === "negative" && !optimalCand) {
    const why = playerCand ? whyNegative(playerCand.microbe) : "it is a negative candidate"
    return `Bad pick — ${playerCand?.microbe.name ?? "your pick"} ${why}. No optimal was available; any neutral would have been better.`
  }

  if (rr.optimalId && optimalCand && playerCand) {
    const playerIn = attrsInRange(playerCand.microbe)
    const optimalIn = attrsInRange(optimalCand.microbe)
    const desiredNote = optimalCand.microbe.trait === req.desired_trait ? ` and has the desired trait (${req.desired_trait})` : ""
    return `Missed optimal — ${optimalCand.microbe.name} covers ${optimalIn.length}/3 attribute ranges${desiredNote}. Your pick (${playerCand.microbe.name}) covers ${playerIn.length}/3, which hurts your pool's achievable max score.`
  }

  const bestNeutral = chooseSet.candidates
    .filter((c) => c.classification === "neutral" && c.neutral_score !== null)
    .sort((a, b) => (b.neutral_score ?? 0) - (a.neutral_score ?? 0))[0]

  if (bestNeutral && playerCand && bestNeutral.microbe.id !== playerCand.microbe.id) {
    const bestIn = attrsInRange(bestNeutral.microbe)
    const playerIn = attrsInRange(playerCand.microbe)
    const desiredNote = bestNeutral.microbe.trait === req.desired_trait ? ` with the desired trait (${req.desired_trait})` : ""
    return `Weaker neutral — ${bestNeutral.microbe.name} covers ${bestIn.length}/3 attribute ranges${desiredNote}. You picked ${playerCand.microbe.name} (${playerIn.length}/3 in range).`
  }

  return "Good pick — best available option this round."
}

export function newSiteWip(siteNumber: 1 | 2 | 3, cfg: GameConfig): PartialSiteAccumulator {
  const sc = cfg.scenarios[siteNumber - 1]!
  return {
    siteNumber,
    scenarioName: sc.name,
    phase1Result: null,
    phase1Selections: [],
    phase2Result: null,
    phase0Result: null,
    phase3Result: null,
    phase4Result: null,
    phase3Pool: [],
    phase3SvgMap: null,
  }
}

export function sealPartialToSiteScore(w: PartialSiteAccumulator, secondsSpent: number): SiteScore {
  const siteNumber = w.siteNumber
  const partial: Omit<SiteScore, "siteAverage"> = {
    siteNumber,
    scenarioName: w.scenarioName,
    timeSpent: secondsSpent,
    phase1: w.phase1Result!,
    phase2: w.phase2Result!,
    phase0: siteNumber === 1 ? null : w.phase0Result ?? null,
    phase3: w.phase3Result!,
    phase4: w.phase4Result!,
  }
  return { ...partial, siteAverage: computeSiteAverage(partial) }
}
