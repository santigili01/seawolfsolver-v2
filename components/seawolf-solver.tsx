"use client"

import { KeyboardEvent, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { Droplets, Flame, Grid3X3, Layers, Ruler, Shield, Star, Zap } from "lucide-react"

type NumericInputValue = "" | number
type PhaseKey = "phase1" | "phase2" | "phase3" | "phase4"
type AttrKey = "Mobility" | "Agility" | "Size"

type ScenarioData = {
  name: string
  attributes: {
    Mobility: { min: number; max: number }
    Agility: { min: number; max: number }
    Size: { min: number; max: number }
  }
  desired_trait: string
  undesired_trait: string
}

type Phase4MicrobeData = {
  mobility: NumericInputValue[]
  agility: NumericInputValue[]
  size: NumericInputValue[]
  desirable: boolean[]
  undesirable: boolean[]
}

type TargetRanges = {
  mobility: { min: NumericInputValue; max: NumericInputValue }
  agility: { min: NumericInputValue; max: NumericInputValue }
  size: { min: NumericInputValue; max: NumericInputValue }
}

type ComboEvaluation = {
  microbes: [number, number, number]
  score: number
  means: { mobility: number; agility: number; size: number }
  checks: {
    mobilityInRange: boolean
    agilityInRange: boolean
    sizeInRange: boolean
    desiredPresent: boolean
    undesiredAbsent: boolean
  }
}

type SolverMicrobe = {
  mobility: number
  agility: number
  size: number
  trait: string
}

type Phase2Result = SolverMicrobe & {
  result: "CURRENT SITE" | "NEXT SITE" | "RETURN"
  reason: string
}

type CandidateInput = {
  mobility: NumericInputValue
  agility: NumericInputValue
  size: NumericInputValue
  desired: boolean
  undesired: boolean
}

type CandidateSolved = {
  input: CandidateInput
  conditionsSatisfied: number
  inviable: boolean
  negative: boolean
  neutralScore: number
  classification: "OPTIMAL" | "NEUTRAL" | "NEGATIVE"
}

const TRAIT_OPTIONS = ["Biofilm-forming", "Thermophilic", "Metal-tolerant", "Halophobic"] as const
const ATTRS: AttrKey[] = ["Mobility", "Agility", "Size"]
const PHASE4_MICROBE_COUNT = 10
const PHASE3_PRELOAD_COUNT = 6
const PHASE3_ROUNDS = 4
const PHASE3_CANDIDATES = 3
const PHASE4_ATTRIBUTE_KEYS = ["mobility", "agility", "size"] as const
const PHASE4_ATTRIBUTE_LABELS = ["Mobility", "Agility", "Size"] as const
const PHASE4_TABLES = [
  { start: 0, end: 4, bgClass: "bg-[#f0f4ff]", borderClass: "border-l-[#2563eb]/50" },
  { start: 5, end: 9, bgClass: "bg-[#f0f4ff]", borderClass: "border-l-[#2563eb]/50" },
] as const

function traitColor(trait: string) {
  const t = trait.toLowerCase()
  if (t.includes("biofilm")) return "#10b981"
  if (t.includes("thermo")) return "#f59e0b"
  if (t.includes("metal")) return "#6366f1"
  if (t.includes("halo")) return "#06b6d4"
  return "#64748b"
}

function traitIcon(trait: string, className = "h-4 w-4") {
  const t = trait.toLowerCase()
  if (t.includes("biofilm")) return <Layers className={className} />
  if (t.includes("thermo")) return <Flame className={className} />
  if (t.includes("metal")) return <Shield className={className} />
  return <Droplets className={className} />
}

const parseNumericInput = (value: string): NumericInputValue => {
  const parsed = parseInt(value, 10)
  if (Number.isNaN(parsed)) return ""
  return Math.max(1, Math.min(10, parsed))
}

const isInRange = (value: number, min: number, max: number) => value >= min && value <= max

const isInviableOnAttribute = (val: number, min: number, max: number) => {
  const minSum = val + 1 + 1
  const maxSum = val + 10 + 10
  return maxSum < min * 3 || minSum > max * 3
}

const blankCandidate = (): CandidateInput => ({
  mobility: "",
  agility: "",
  size: "",
  desired: false,
  undesired: false,
})

export function SeawolfSolver() {
  const [scenarios, setScenarios] = useState<ScenarioData[]>([])
  const [activePhase, setActivePhase] = useState<PhaseKey>("phase1")

  useEffect(() => {
    fetch("/scenarios.json")
      .then((r) => r.json())
      .then((d) => setScenarios(d.scenarios ?? []))
  }, [])

  const phaseTabs: { key: PhaseKey; label: string }[] = [
    { key: "phase1", label: "Phase 1 — Profiling" },
    { key: "phase2", label: "Phase 2 — Categorization" },
    { key: "phase3", label: "Phase 3 — Prospect Pool" },
    { key: "phase4", label: "Phase 4 — Treatment" },
  ]

  // Phase 1
  const [phase1ScenarioName, setPhase1ScenarioName] = useState("")
  const phase1Scenario = scenarios.find((s) => s.name === phase1ScenarioName) ?? null
  const phase1Extremes = useMemo(() => {
    if (!phase1Scenario) return []
    const scored = ATTRS.map((a) => ({
      attr: a,
      score: Math.abs((phase1Scenario.attributes[a].min + phase1Scenario.attributes[a].max) / 2 - 5.5),
    }))
    const best = Math.max(...scored.map((x) => x.score))
    return scored.filter((x) => x.score === best).map((x) => x.attr)
  }, [phase1Scenario])

  // Phase 2
  const [p2Site1ScenarioName, setP2Site1ScenarioName] = useState("")
  const [p2RevealType, setP2RevealType] = useState<"trait" | "attribute">("trait")
  const [p2RevealTrait, setP2RevealTrait] = useState<string>(TRAIT_OPTIONS[0])
  const [p2RevealAttr, setP2RevealAttr] = useState<AttrKey>("Mobility")
  const [p2RevealMin, setP2RevealMin] = useState<NumericInputValue>("")
  const [p2RevealMax, setP2RevealMax] = useState<NumericInputValue>("")
  const [p2Current, setP2Current] = useState<SolverMicrobe>({ mobility: 1, agility: 1, size: 1, trait: TRAIT_OPTIONS[0] })
  const [p2Index, setP2Index] = useState(0)
  const [p2Results, setP2Results] = useState<Phase2Result[]>([])
  const p2Site1Scenario = scenarios.find((s) => s.name === p2Site1ScenarioName) ?? null
  const p2SetupComplete =
    !!p2Site1Scenario &&
    (p2RevealType === "trait" || (typeof p2RevealMin === "number" && typeof p2RevealMax === "number"))

  const evaluateP2 = (m: SolverMicrobe): { result: Phase2Result["result"]; reason: string } => {
    if (!p2Site1Scenario) return { result: "RETURN", reason: "Missing setup." }
    const satisfiesSite2 =
      p2RevealType === "trait"
        ? m.trait === p2RevealTrait
        : isInRange(m[p2RevealAttr.toLowerCase() as "mobility" | "agility" | "size"], Number(p2RevealMin), Number(p2RevealMax))
    if (satisfiesSite2 && m.trait !== p2Site1Scenario.undesired_trait) {
      return {
        result: "NEXT SITE",
        reason:
          p2RevealType === "trait"
            ? `Satisfies site 2 trait insight (${p2RevealTrait}).`
            : `Satisfies site 2 insight (${p2RevealAttr} ${p2RevealMin}-${p2RevealMax}).`,
      }
    }
    const inRangeCount = ATTRS.filter((a) => {
      const val = m[a.toLowerCase() as "mobility" | "agility" | "size"]
      return isInRange(val, p2Site1Scenario.attributes[a].min, p2Site1Scenario.attributes[a].max)
    }).length
    const inviable = ATTRS.some((a) => {
      const val = m[a.toLowerCase() as "mobility" | "agility" | "size"]
      return isInviableOnAttribute(val, p2Site1Scenario.attributes[a].min, p2Site1Scenario.attributes[a].max)
    })
    if (!satisfiesSite2 && m.trait !== p2Site1Scenario.undesired_trait && inRangeCount > 0 && !inviable) {
      return { result: "CURRENT SITE", reason: `Fits site 1 — ${inRangeCount} attributes in range.` }
    }
    return { result: "RETURN", reason: "Does not fit either site." }
  }
  const p2Preview = p2SetupComplete ? evaluateP2(p2Current) : null
  const pushP2Microbe = () => {
    if (!p2SetupComplete || p2Index >= 10) return
    const out = evaluateP2(p2Current)
    setP2Results((prev) => [...prev, { ...p2Current, result: out.result, reason: out.reason }])
    setP2Index((x) => Math.min(10, x + 1))
    setP2Current({ mobility: 1, agility: 1, size: 1, trait: TRAIT_OPTIONS[0] })
  }

  // Phase 3
  const [p3ScenarioName, setP3ScenarioName] = useState("")
  const p3Scenario = scenarios.find((s) => s.name === p3ScenarioName) ?? null
  const [p3Preloaded, setP3Preloaded] = useState<CandidateInput[]>(Array.from({ length: PHASE3_PRELOAD_COUNT }, blankCandidate))
  const [p3Rounds, setP3Rounds] = useState<CandidateInput[][]>(
    Array.from({ length: PHASE3_ROUNDS }, () => Array.from({ length: PHASE3_CANDIDATES }, blankCandidate))
  )
  const [p3Solved, setP3Solved] = useState<{ candidates: CandidateSolved[]; recommendedIndex: number }[]>([])
  const p3UnlockedRound = p3Solved.length
  const updateP3Candidate = (
    section: "pre" | "round",
    round: number,
    idx: number,
    key: keyof CandidateInput,
    value: NumericInputValue | boolean,
  ) => {
    if (section === "pre") {
      setP3Preloaded((prev) =>
        prev.map((c, i) => (i === idx ? { ...c, [key]: value } : c))
      )
    } else {
      setP3Rounds((prev) =>
        prev.map((r, rIdx) => (rIdx === round ? r.map((c, i) => (i === idx ? { ...c, [key]: value } : c)) : r))
      )
    }
  }
  const solveRound = (roundIdx: number) => {
    if (!p3Scenario || roundIdx !== p3UnlockedRound) return
    const solved: CandidateSolved[] = p3Rounds[roundIdx].map((cand) => {
      const mobility = Number(cand.mobility)
      const agility = Number(cand.agility)
      const size = Number(cand.size)
      const inviable =
        isInviableOnAttribute(mobility, p3Scenario.attributes.Mobility.min, p3Scenario.attributes.Mobility.max) ||
        isInviableOnAttribute(agility, p3Scenario.attributes.Agility.min, p3Scenario.attributes.Agility.max) ||
        isInviableOnAttribute(size, p3Scenario.attributes.Size.min, p3Scenario.attributes.Size.max)
      const attrsInRange =
        (isInRange(mobility, p3Scenario.attributes.Mobility.min, p3Scenario.attributes.Mobility.max) ? 1 : 0) +
        (isInRange(agility, p3Scenario.attributes.Agility.min, p3Scenario.attributes.Agility.max) ? 1 : 0) +
        (isInRange(size, p3Scenario.attributes.Size.min, p3Scenario.attributes.Size.max) ? 1 : 0)
      const desiredPresent = cand.desired
      const undesiredAbsent = !cand.undesired
      const conditionsSatisfied = attrsInRange + (desiredPresent ? 1 : 0) + (undesiredAbsent ? 1 : 0)
      const negative = cand.undesired || inviable
      const neutralScore = attrsInRange / 3 + (desiredPresent && !inviable ? 0.5 : 0)
      return { input: cand, conditionsSatisfied, inviable, negative, neutralScore, classification: "NEUTRAL" }
    })
    const nonNeg = solved.filter((s) => !s.negative)
    const best = nonNeg.length ? Math.max(...nonNeg.map((x) => x.neutralScore)) : -Infinity
    let recommendedIndex = -1
    const classified = solved.map((s, idx) => {
      if (s.negative) return { ...s, classification: "NEGATIVE" as const }
      if (s.neutralScore === best) {
        if (recommendedIndex === -1) recommendedIndex = idx
        return { ...s, classification: "OPTIMAL" as const }
      }
      return { ...s, classification: "NEUTRAL" as const }
    })
    if (recommendedIndex === -1 && nonNeg.length > 0) {
      recommendedIndex = solved.findIndex((x) => !x.negative && x.neutralScore === best)
    }
    setP3Solved((prev) => [...prev, { candidates: classified, recommendedIndex }])
  }

  // Phase 4 preserved computation
  const [showAllOptimalCombos, setShowAllOptimalCombos] = useState(false)
  const [phase4ScenarioName, setPhase4ScenarioName] = useState("")
  const [targetRanges, setTargetRanges] = useState<TargetRanges>({
    mobility: { min: "", max: "" },
    agility: { min: "", max: "" },
    size: { min: "", max: "" },
  })
  const [microbeData, setMicrobeData] = useState<Phase4MicrobeData>({
    mobility: Array(PHASE4_MICROBE_COUNT).fill(""),
    agility: Array(PHASE4_MICROBE_COUNT).fill(""),
    size: Array(PHASE4_MICROBE_COUNT).fill(""),
    desirable: Array(PHASE4_MICROBE_COUNT).fill(false),
    undesirable: Array(PHASE4_MICROBE_COUNT).fill(false),
  })
  const handleRangeChange = (attribute: keyof TargetRanges, field: "min" | "max", value: string) => {
    const numValue = parseNumericInput(value)
    setTargetRanges((prev) => ({ ...prev, [attribute]: { ...prev[attribute], [field]: numValue } }))
  }
  const handleMicrobeValueChange = (attribute: keyof Omit<Phase4MicrobeData, "desirable" | "undesirable">, index: number, value: string) => {
    const numValue = parseNumericInput(value)
    setMicrobeData((prev) => ({ ...prev, [attribute]: prev[attribute].map((v, i) => (i === index ? numValue : v)) }))
  }
  const handleCheckboxChange = (type: "desirable" | "undesirable", index: number, checked: boolean) => {
    setMicrobeData((prev) => ({ ...prev, [type]: prev[type].map((v, i) => (i === index ? checked : v)) }))
  }
  const handleMicrobeInputKeyDown = (event: KeyboardEvent<HTMLInputElement>, microbeIndex: number, attributeIndex: number) => {
    if (event.key !== "Enter") return
    event.preventDefault()
    let nextMicrobeIndex = microbeIndex
    let nextAttributeIndex = attributeIndex + 1
    if (nextAttributeIndex > 2) {
      nextAttributeIndex = 0
      nextMicrobeIndex = microbeIndex === PHASE4_MICROBE_COUNT - 1 ? 0 : microbeIndex + 1
    }
    const nextInput = document.querySelector<HTMLInputElement>(
      `input[data-microbe-index="${nextMicrobeIndex}"][data-attribute-index="${nextAttributeIndex}"]`
    )
    nextInput?.focus()
    nextInput?.select()
  }
  const clearAllInputs = () => {
    setTargetRanges({ mobility: { min: "", max: "" }, agility: { min: "", max: "" }, size: { min: "", max: "" } })
    setMicrobeData({
      mobility: Array(PHASE4_MICROBE_COUNT).fill(""),
      agility: Array(PHASE4_MICROBE_COUNT).fill(""),
      size: Array(PHASE4_MICROBE_COUNT).fill(""),
      desirable: Array(PHASE4_MICROBE_COUNT).fill(false),
      undesirable: Array(PHASE4_MICROBE_COUNT).fill(false),
    })
  }
  const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
  const fillRandomInputs = () => {
    const randomRange = () => {
      const min = randomInt(1, 7)
      const maxDelta = Math.min(4, 10 - min)
      const delta = randomInt(2, maxDelta)
      return { min, max: min + delta }
    }
    setTargetRanges({ mobility: randomRange(), agility: randomRange(), size: randomRange() })
    setMicrobeData({
      mobility: Array.from({ length: PHASE4_MICROBE_COUNT }, () => randomInt(1, 10)),
      agility: Array.from({ length: PHASE4_MICROBE_COUNT }, () => randomInt(1, 10)),
      size: Array.from({ length: PHASE4_MICROBE_COUNT }, () => randomInt(1, 10)),
      desirable: Array.from({ length: PHASE4_MICROBE_COUNT }, () => Math.random() < 0.25),
      undesirable: Array.from({ length: PHASE4_MICROBE_COUNT }, () => Math.random() < 0.15),
    })
  }
  useEffect(() => {
    const handleGlobalShortcut = (event: globalThis.KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "r") {
        event.preventDefault()
        clearAllInputs()
        return
      }
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault()
        fillRandomInputs()
      }
    }
    window.addEventListener("keydown", handleGlobalShortcut)
    return () => window.removeEventListener("keydown", handleGlobalShortcut)
  }, [])
  useEffect(() => {
    const chosen = scenarios.find((s) => s.name === phase4ScenarioName)
    if (!chosen) return
    setTargetRanges({
      mobility: { min: chosen.attributes.Mobility.min, max: chosen.attributes.Mobility.max },
      agility: { min: chosen.attributes.Agility.min, max: chosen.attributes.Agility.max },
      size: { min: chosen.attributes.Size.min, max: chosen.attributes.Size.max },
    })
  }, [phase4ScenarioName, scenarios])
  const areRangeInputsComplete = useMemo(() => Object.values(targetRanges).every((r) => r.min !== "" && r.max !== ""), [targetRanges])
  const areMicrobeInputsComplete = useMemo(
    () => microbeData.mobility.every((x) => x !== "") && microbeData.agility.every((x) => x !== "") && microbeData.size.every((x) => x !== ""),
    [microbeData]
  )
  const areAllInputsComplete = areRangeInputsComplete && areMicrobeInputsComplete
  const numericTargetRanges = useMemo(
    () => ({
      mobility: { min: Number(targetRanges.mobility.min), max: Number(targetRanges.mobility.max) },
      agility: { min: Number(targetRanges.agility.min), max: Number(targetRanges.agility.max) },
      size: { min: Number(targetRanges.size.min), max: Number(targetRanges.size.max) },
    }),
    [targetRanges]
  )
  const evaluations = useMemo<ComboEvaluation[]>(() => {
    if (!areAllInputsComplete) return []
    const mobility = microbeData.mobility.map(Number)
    const agility = microbeData.agility.map(Number)
    const size = microbeData.size.map(Number)
    const combos: ComboEvaluation[] = []
    for (let i = 0; i < PHASE4_MICROBE_COUNT; i++) {
      for (let j = i + 1; j < PHASE4_MICROBE_COUNT; j++) {
        for (let k = j + 1; k < PHASE4_MICROBE_COUNT; k++) {
          const microbes: [number, number, number] = [i, j, k]
          const means = { mobility: (mobility[i] + mobility[j] + mobility[k]) / 3, agility: (agility[i] + agility[j] + agility[k]) / 3, size: (size[i] + size[j] + size[k]) / 3 }
          const checks = {
            mobilityInRange: means.mobility >= numericTargetRanges.mobility.min && means.mobility <= numericTargetRanges.mobility.max,
            agilityInRange: means.agility >= numericTargetRanges.agility.min && means.agility <= numericTargetRanges.agility.max,
            sizeInRange: means.size >= numericTargetRanges.size.min && means.size <= numericTargetRanges.size.max,
            desiredPresent: microbes.some((idx) => microbeData.desirable[idx]),
            undesiredAbsent: microbes.every((idx) => !microbeData.undesirable[idx]),
          }
          let score = 100
          if (!checks.mobilityInRange) score -= 20
          if (!checks.agilityInRange) score -= 20
          if (!checks.sizeInRange) score -= 20
          if (!checks.desiredPresent) score -= 20
          if (!checks.undesiredAbsent) score -= 20
          combos.push({ microbes, score: Math.max(0, score), means, checks })
        }
      }
    }
    return combos
  }, [areAllInputsComplete, microbeData, numericTargetRanges])
  const maxScore = useMemo(() => evaluations.reduce((best, combo) => Math.max(best, combo.score), 0), [evaluations])
  const winningCombos = useMemo(() => evaluations.filter((combo) => combo.score === maxScore), [evaluations, maxScore])
  const primaryWinningCombo = winningCombos[0] ?? null
  const highlightedColumns = useMemo(() => (areAllInputsComplete && maxScore > 0 && primaryWinningCombo ? new Set(primaryWinningCombo.microbes) : new Set<number>()), [areAllInputsComplete, maxScore, primaryWinningCombo])

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-5">
          {phaseTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActivePhase(tab.key)}
              className={cn("border-b-2 pb-2 text-sm font-semibold", activePhase === tab.key ? "border-[#4ECDC4] text-[#0f766e]" : "border-transparent text-gray-500")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activePhase === "phase1" && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1a202c]">Phase 1 Solver</h2>
          <div className="mt-4">
            <label className="text-sm font-semibold text-gray-700">Scenario</label>
            <select className="mt-1 w-full rounded-md border-2 border-[#94a3b8] bg-white px-3 py-2 text-sm" value={phase1ScenarioName} onChange={(e) => setPhase1ScenarioName(e.target.value)}>
              <option value="">Select a scenario</option>
              {scenarios.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          {phase1Scenario ? (
            <div className="mt-5 space-y-3 text-sm">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="font-semibold">Pick this trait:</div>
                <div className="mt-1 inline-flex items-center gap-2 font-semibold" style={{ color: traitColor(phase1Scenario.desired_trait) }}>
                  {traitIcon(phase1Scenario.desired_trait)}
                  <span>{phase1Scenario.desired_trait}</span>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="font-semibold">Pick this attribute:</div>
                <div className="mt-1 flex flex-wrap gap-2">{phase1Extremes.map((a) => <span key={a} className="rounded-full bg-[#eefcfb] px-2 py-1 font-semibold text-[#0f766e]">{a}</span>)}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="font-semibold">Set the slider to:</div>
                {phase1Extremes.map((a) => (
                  <div key={`range-${a}`} className="mt-1 text-gray-700">{a}: {phase1Scenario.attributes[a].min} - {phase1Scenario.attributes[a].max}</div>
                ))}
                <div className="mt-2 text-xs text-gray-500">The slider default is 4. Only move it if your chosen attribute requires it.</div>
              </div>
            </div>
          ) : null}
        </section>
      )}

      {activePhase === "phase2" && (
        <section className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#1a202c]">Phase 2 Setup</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-gray-700">Site 1 Scenario</label>
                <select className="mt-1 w-full rounded-md border-2 border-[#94a3b8] bg-white px-3 py-2 text-sm" value={p2Site1ScenarioName} onChange={(e) => setP2Site1ScenarioName(e.target.value)}>
                  <option value="">Select a scenario</option>
                  {scenarios.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Revealed characteristic about Site 2</label>
                <div className="mt-2 flex items-center gap-4 text-sm">
                  <label><input type="radio" className="mr-1" checked={p2RevealType === "trait"} onChange={() => setP2RevealType("trait")} />Trait</label>
                  <label><input type="radio" className="mr-1" checked={p2RevealType === "attribute"} onChange={() => setP2RevealType("attribute")} />Attribute</label>
                </div>
                {p2RevealType === "trait" ? (
                  <select className="mt-2 w-full rounded-md border-2 border-[#94a3b8] bg-white px-3 py-2 text-sm" value={p2RevealTrait} onChange={(e) => setP2RevealTrait(e.target.value)}>
                    {TRAIT_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                ) : (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <select className="rounded-md border-2 border-[#94a3b8] bg-white px-2 py-2 text-sm" value={p2RevealAttr} onChange={(e) => setP2RevealAttr(e.target.value as AttrKey)}>
                      {ATTRS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <Input type="number" min={1} max={10} value={p2RevealMin} onChange={(e) => setP2RevealMin(parseNumericInput(e.target.value))} className="border-2 border-[#94a3b8]" placeholder="Min" />
                    <Input type="number" min={1} max={10} value={p2RevealMax} onChange={(e) => setP2RevealMax(parseNumericInput(e.target.value))} className="border-2 border-[#94a3b8]" placeholder="Max" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-[#1a202c]">Microbe {Math.min(p2Index + 1, 10)} of 10</h3>
            {!p2SetupComplete ? (
              <p className="mt-2 text-sm text-gray-500">Complete setup above to unlock microbe categorization.</p>
            ) : p2Index >= 10 ? (
              <p className="mt-2 text-sm font-semibold text-emerald-700">All 10 microbes processed.</p>
            ) : (
              <>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <Input type="number" min={1} max={10} value={p2Current.mobility} onChange={(e) => setP2Current((p) => ({ ...p, mobility: Number(parseNumericInput(e.target.value) || 1) }))} className="border-2 border-[#94a3b8]" placeholder="Mobility" onKeyDown={(e) => e.key === "Enter" && pushP2Microbe()} />
                  <Input type="number" min={1} max={10} value={p2Current.agility} onChange={(e) => setP2Current((p) => ({ ...p, agility: Number(parseNumericInput(e.target.value) || 1) }))} className="border-2 border-[#94a3b8]" placeholder="Agility" onKeyDown={(e) => e.key === "Enter" && pushP2Microbe()} />
                  <Input type="number" min={1} max={10} value={p2Current.size} onChange={(e) => setP2Current((p) => ({ ...p, size: Number(parseNumericInput(e.target.value) || 1) }))} className="border-2 border-[#94a3b8]" placeholder="Size" onKeyDown={(e) => e.key === "Enter" && pushP2Microbe()} />
                  <select className="rounded-md border-2 border-[#94a3b8] bg-white px-3 py-2 text-sm" value={p2Current.trait} onChange={(e) => setP2Current((p) => ({ ...p, trait: e.target.value }))}>
                    {TRAIT_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {p2Preview ? (
                  <div className="mt-3">
                    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold", p2Preview.result === "CURRENT SITE" ? "bg-emerald-100 text-emerald-800" : p2Preview.result === "NEXT SITE" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-700")}>
                      {p2Preview.result}
                    </span>
                    <p className="mt-1 text-sm text-gray-700">{p2Preview.reason}</p>
                  </div>
                ) : null}
                <Button className="mt-3" onClick={pushP2Microbe}>Next microbe</Button>
              </>
            )}
            {p2Results.length > 0 ? (
              <div className="mt-5">
                <div className="mb-2 text-sm font-semibold text-gray-800">Summary</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-gray-600"><tr><th>#</th><th>M</th><th>A</th><th>S</th><th>Trait</th><th>Result</th><th>Reason</th></tr></thead>
                    <tbody>
                      {p2Results.map((r, i) => (
                        <tr key={`p2-r-${i}`} className="border-t"><td>{i + 1}</td><td>{r.mobility}</td><td>{r.agility}</td><td>{r.size}</td><td>{r.trait}</td><td className="font-semibold">{r.result}</td><td>{r.reason}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button variant="outline" className="mt-3" onClick={() => { setP2Index(0); setP2Results([]); setP2Current({ mobility: 1, agility: 1, size: 1, trait: TRAIT_OPTIONS[0] }) }}>
                  Start over
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {activePhase === "phase3" && (
        <section className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#1a202c]">Phase 3 Setup</h2>
            <select className="mt-2 w-full rounded-md border-2 border-[#94a3b8] bg-white px-3 py-2 text-sm" value={p3ScenarioName} onChange={(e) => { setP3ScenarioName(e.target.value); setP3Solved([]) }}>
              <option value="">Select scenario</option>
              {scenarios.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          {p3Scenario ? (
            <>
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-bold text-[#1a202c]">Preloaded Pool (P1-P6)</h3>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {p3Preloaded.map((m, idx) => (
                    <div key={`p3-pre-${idx}`} className="rounded-lg border border-gray-200 p-3">
                      <div className="mb-2 text-xs font-bold text-gray-700">P{idx + 1}</div>
                      <div className="grid grid-cols-3 gap-1">
                        <Input type="number" min={1} max={10} value={m.mobility} onChange={(e) => updateP3Candidate("pre", 0, idx, "mobility", parseNumericInput(e.target.value))} className="border-2 border-[#94a3b8]" />
                        <Input type="number" min={1} max={10} value={m.agility} onChange={(e) => updateP3Candidate("pre", 0, idx, "agility", parseNumericInput(e.target.value))} className="border-2 border-[#94a3b8]" />
                        <Input type="number" min={1} max={10} value={m.size} onChange={(e) => updateP3Candidate("pre", 0, idx, "size", parseNumericInput(e.target.value))} className="border-2 border-[#94a3b8]" />
                      </div>
                      <div className="mt-2 flex gap-3 text-xs">
                        <label className="flex items-center gap-1"><Checkbox checked={m.desired} onCheckedChange={(v) => updateP3Candidate("pre", 0, idx, "desired", v === true)} />Desired</label>
                        <label className="flex items-center gap-1"><Checkbox checked={m.undesired} onCheckedChange={(v) => updateP3Candidate("pre", 0, idx, "undesired", v === true)} />Undesired</label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {Array.from({ length: PHASE3_ROUNDS }, (_, roundIdx) => {
                const unlocked = roundIdx <= p3UnlockedRound
                const solved = p3Solved[roundIdx]
                return (
                  <div key={`p3-round-${roundIdx}`} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="text-base font-bold text-[#1a202c]">Round {roundIdx + 1}</h3>
                    {!unlocked ? <p className="mt-2 text-sm text-gray-500">Complete previous round to unlock.</p> : null}
                    {unlocked ? (
                      <>
                        <div className="mt-3 grid gap-2 md:grid-cols-3">
                          {p3Rounds[roundIdx].map((cand, candIdx) => {
                            const solvedCard = solved?.candidates[candIdx]
                            return (
                              <div key={`cand-${roundIdx}-${candIdx}`} className={cn("rounded-lg border p-3", solved && solved.recommendedIndex === candIdx ? "border-emerald-500 bg-emerald-50" : "border-gray-200")}>
                                <div className="mb-2 text-xs font-bold text-gray-700">Candidate {candIdx + 1}</div>
                                <div className="grid grid-cols-3 gap-1">
                                  <Input type="number" min={1} max={10} value={cand.mobility} onChange={(e) => updateP3Candidate("round", roundIdx, candIdx, "mobility", parseNumericInput(e.target.value))} className="border-2 border-[#94a3b8]" />
                                  <Input type="number" min={1} max={10} value={cand.agility} onChange={(e) => updateP3Candidate("round", roundIdx, candIdx, "agility", parseNumericInput(e.target.value))} className="border-2 border-[#94a3b8]" />
                                  <Input type="number" min={1} max={10} value={cand.size} onChange={(e) => updateP3Candidate("round", roundIdx, candIdx, "size", parseNumericInput(e.target.value))} className="border-2 border-[#94a3b8]" />
                                </div>
                                <div className="mt-2 flex gap-3 text-xs">
                                  <label className="flex items-center gap-1"><Checkbox checked={cand.desired} onCheckedChange={(v) => updateP3Candidate("round", roundIdx, candIdx, "desired", v === true)} />Desired</label>
                                  <label className="flex items-center gap-1"><Checkbox checked={cand.undesired} onCheckedChange={(v) => updateP3Candidate("round", roundIdx, candIdx, "undesired", v === true)} />Undesired</label>
                                </div>
                                {solvedCard ? (
                                  <div className="mt-2 space-y-1 text-xs">
                                    <span className={cn("inline-flex rounded-full px-2 py-0.5 font-bold", solvedCard.classification === "OPTIMAL" ? "bg-emerald-100 text-emerald-700" : solvedCard.classification === "NEUTRAL" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                                      {solvedCard.classification}
                                    </span>
                                    <div>Conditions: {solvedCard.conditionsSatisfied}</div>
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                        {roundIdx === p3UnlockedRound && !solved ? (
                          <Button className="mt-3" onClick={() => solveRound(roundIdx)}>Solve round</Button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                )
              })}
              {p3Solved.length === PHASE3_ROUNDS ? (
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-bold text-[#1a202c]">Final Recommended Pool (10)</h3>
                  <div className="mt-2 text-sm text-gray-700">
                    Preloaded: 6 microbes + Picks from rounds:
                    {" "}
                    {p3Solved.map((r, i) => `R${i + 1} C${r.recommendedIndex + 1}`).join(", ")}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      )}

      {activePhase === "phase4" && (
        <section className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#1a202c]">Phase 4 Solver</h2>
            <div className="mt-2">
              <label className="text-sm font-semibold text-gray-700">Scenario (auto-fill ranges)</label>
              <select className="mt-1 w-full rounded-md border-2 border-[#94a3b8] bg-white px-3 py-2 text-sm" value={phase4ScenarioName} onChange={(e) => setPhase4ScenarioName(e.target.value)}>
                <option value="">Select scenario</option>
                {scenarios.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 items-stretch gap-2.5 lg:grid-cols-[1fr_1.25fr_2.75fr]">
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <h3 className="mb-2 text-[1.05rem] font-semibold">Target Ranges</h3>
              <div className="space-y-2">
                {PHASE4_ATTRIBUTE_LABELS.map((attr, idx) => {
                  const key = PHASE4_ATTRIBUTE_KEYS[idx]
                  return (
                    <div key={attr} className="flex items-center gap-2">
                      <span className="w-24 text-base font-medium text-[#374151]">{attr}</span>
                      <Input type="number" min={1} max={10} value={targetRanges[key].min} onChange={(e) => handleRangeChange(key, "min", e.target.value)} className="h-9 w-14 border-2 border-[#94a3b8] text-center" />
                      <span>-</span>
                      <Input type="number" min={1} max={10} value={targetRanges[key].max} onChange={(e) => handleRangeChange(key, "max", e.target.value)} className="h-9 w-14 border-2 border-[#94a3b8] text-center" />
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <h3 className="mb-2 text-[1.05rem] font-semibold">Results</h3>
              {areAllInputsComplete && primaryWinningCombo ? (
                <div className="space-y-2">
                  <p className={cn("text-5xl font-bold leading-none", maxScore === 100 ? "text-[#16a34a]" : maxScore === 80 ? "text-[#d97706]" : "text-[#dc2626]")}>{maxScore}</p>
                  <div className="flex flex-wrap gap-1.5">{primaryWinningCombo.microbes.map((idx) => <span key={idx} className="rounded-md bg-[#2563eb] px-2 py-0.5 text-xs font-semibold text-white">M{idx + 1}</span>)}</div>
                  <button type="button" className="text-[11px] text-blue-600 hover:underline" onClick={() => setShowAllOptimalCombos((p) => !p)}>
                    {showAllOptimalCombos ? "Hide all optimal combinations" : "All optimal combinations"}
                  </button>
                  {showAllOptimalCombos ? <div className="max-h-24 space-y-1 overflow-auto pr-1">{winningCombos.map((combo) => <div key={combo.microbes.join("-")} className="text-[11px] text-gray-600">{combo.microbes.map((m) => `M${m + 1}`).join(", ")}</div>)}</div> : null}
                </div>
              ) : <p className="text-sm text-gray-500">Fill all ranges and microbe values to evaluate all 120 combinations.</p>}
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <h3 className="mb-2 text-[1.05rem] font-semibold">Conditions</h3>
              {areAllInputsComplete && primaryWinningCombo ? (
                <ul className="space-y-1.5">
                  {[
                    { label: "Mobility mean in range", icon: <Grid3X3 className="h-3.5 w-3.5" />, mean: primaryWinningCombo.means.mobility.toFixed(2), pass: primaryWinningCombo.checks.mobilityInRange },
                    { label: "Agility mean in range", icon: <Zap className="h-3.5 w-3.5" />, mean: primaryWinningCombo.means.agility.toFixed(2), pass: primaryWinningCombo.checks.agilityInRange },
                    { label: "Size mean in range", icon: <Ruler className="h-3.5 w-3.5" />, mean: primaryWinningCombo.means.size.toFixed(2), pass: primaryWinningCombo.checks.sizeInRange },
                    { label: "Desired trait present", icon: traitIcon("Halophobic", "h-3.5 w-3.5"), mean: null, pass: primaryWinningCombo.checks.desiredPresent },
                    { label: "Undesired trait absent", icon: traitIcon("Metal-tolerant", "h-3.5 w-3.5"), mean: null, pass: primaryWinningCombo.checks.undesiredAbsent },
                  ].map((check) => (
                    <li key={check.label} className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2 text-[11px]">
                        <span className="text-gray-600">{check.icon}</span>
                        <span className={check.pass ? "text-gray-900" : "text-gray-500"}>{check.label}</span>
                        {check.mean ? <span className="font-bold text-gray-800">{check.mean}</span> : null}
                      </div>
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold text-white", check.pass ? "bg-[#16a34a]" : "bg-[#dc2626]")}>{check.pass ? "PASS" : "FAIL"}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500">Results appear after all inputs are complete.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[1.05rem] font-semibold">Microbe Data</h3>
              <div className="flex gap-2">
                <div className="text-right"><Button variant="outline" size="sm" className="h-10 border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb] hover:text-white" onClick={fillRandomInputs}>Random Input</Button><p className="mt-1 text-[10px] text-gray-500">Ctrl+Shift+F</p></div>
                <div className="text-right"><Button variant="outline" size="sm" className="h-10 border-[#dc2626] text-[#dc2626] hover:bg-[#dc2626] hover:text-white" onClick={clearAllInputs}>Clear All</Button><p className="mt-1 text-[10px] text-gray-500">Ctrl+Shift+R</p></div>
              </div>
            </div>
            <div className="space-y-2.5">
              {PHASE4_TABLES.map((table) => {
                const indices = Array.from({ length: table.end - table.start + 1 }, (_, idx) => table.start + idx)
                return (
                  <div key={table.start} className={cn("overflow-x-auto rounded-md border border-[#cbd5e1] border-l-2 p-2 shadow-inner", table.bgClass, table.borderClass)}>
                    <table className="w-full table-fixed border-separate border-spacing-x-2 border-spacing-y-1">
                      <thead><tr><th className="w-22 rounded-md bg-[#f1f5f9] px-1.5 py-1 text-left text-xs font-bold">Microbe</th>{indices.map((idx) => <th key={idx} className={cn("rounded-t-md border border-[#cbd5e1] border-b-0 bg-[#e2e8f0] px-4 py-1 text-center text-xs font-bold", highlightedColumns.has(idx) && "border-[#16a34a] bg-[#dcfce7]")}><span className={cn("inline-flex min-w-8 justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold text-white", table.start === 0 ? "bg-[#2563eb]" : "bg-[#6366f1]", highlightedColumns.has(idx) && "bg-[#16a34a]")}>M{idx + 1}</span></th>)}</tr></thead>
                      <tbody>
                        {PHASE4_ATTRIBUTE_LABELS.map((attr, attrIndex) => {
                          const key = PHASE4_ATTRIBUTE_KEYS[attrIndex]
                          return (
                            <tr key={attr}>
                              <td className="whitespace-nowrap px-1.5 py-0.5 text-[11px] font-semibold text-[#374151]">{attr}</td>
                              {indices.map((idx) => (
                                <td key={`${attr}-${idx}`} className={cn("border-x border-[#cbd5e1] px-4 py-0.5", attrIndex % 2 === 0 ? "bg-white" : "bg-[#f1f5f9]", highlightedColumns.has(idx) && "border-[#16a34a] bg-[#dcfce7]")}>
                                  <Input type="number" min={1} max={10} value={microbeData[key][idx]} onChange={(e) => handleMicrobeValueChange(key, idx, e.target.value)} onKeyDown={(e) => handleMicrobeInputKeyDown(e, idx, attrIndex)} data-microbe-index={idx} data-attribute-index={attrIndex} className="h-7 border-2 border-[#94a3b8] px-1 text-center text-[11px] font-medium" />
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                        <tr><td className="bg-[#f1f5f9] px-1.5 py-0.5 text-[10px] font-semibold">Desired Trait</td>{indices.map((idx) => <td key={`des-${idx}`} className={cn("border-x border-[#cbd5e1] bg-[#f1f5f9] px-4 py-0.5", highlightedColumns.has(idx) && "border-[#16a34a] bg-[#dcfce7]")}><div className="flex h-7 items-center justify-center rounded-md border bg-white"><Checkbox checked={microbeData.desirable[idx]} onCheckedChange={(v) => handleCheckboxChange("desirable", idx, v === true)} /></div></td>)}</tr>
                        <tr><td className="bg-white px-1.5 py-0.5 text-[10px] font-semibold">Undesired Trait</td>{indices.map((idx) => <td key={`undes-${idx}`} className={cn("rounded-b-md border-x border-b border-[#cbd5e1] bg-white px-4 py-0.5", highlightedColumns.has(idx) && "border-[#16a34a] bg-[#dcfce7]")}><div className="flex h-7 items-center justify-center rounded-md border bg-white"><Checkbox checked={microbeData.undesirable[idx]} onCheckedChange={(v) => handleCheckboxChange("undesirable", idx, v === true)} /></div></td>)}</tr>
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
