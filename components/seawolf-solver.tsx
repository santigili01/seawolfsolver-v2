"use client"

import { KeyboardEvent, ReactNode, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { Droplets, Flame, Grid3X3, Layers, Ruler, Shield, Star, Zap } from "lucide-react"

type NumericInputValue = "" | number
type PhaseKey = "config" | "phase1" | "phase2" | "phase3" | "phase4"

type SiteConfig = {
  attrRanges: [
    { min: NumericInputValue; max: NumericInputValue },
    { min: NumericInputValue; max: NumericInputValue },
    { min: NumericInputValue; max: NumericInputValue },
  ]
  desiredTrait: string
  undesiredTrait: string
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

const PHASE4_MICROBE_COUNT = 10
const PHASE3_PRELOAD_COUNT = 6
const PHASE3_ROUNDS = 4
const PHASE3_CANDIDATES = 3
const PHASE4_ATTRIBUTE_KEYS = ["mobility", "agility", "size"] as const

const FALLBACK_TRAIT_COLORS = ["#10b981", "#f59e0b", "#6366f1", "#06b6d4"] as const

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

function traitColor(trait: string, index?: number): string {
  const t = trait.toLowerCase()
  if (t.includes("biofilm")) return "#10b981"
  if (t.includes("thermo")) return "#f59e0b"
  if (t.includes("metal")) return "#6366f1"
  if (t.includes("halo")) return "#06b6d4"
  const i = typeof index === "number" ? ((index % 4) + 4) % 4 : 0
  return FALLBACK_TRAIT_COLORS[i]
}

function traitIcon(trait: string, index?: number, className = "h-4 w-4"): ReactNode {
  const t = trait.toLowerCase()
  if (t.includes("biofilm")) return <Layers className={className} />
  if (t.includes("thermo")) return <Flame className={className} />
  if (t.includes("metal")) return <Shield className={className} />
  if (t.includes("halo")) return <Droplets className={className} />
  const i = typeof index === "number" ? ((index % 4) + 4) % 4 : 0
  if (i === 0) return <Layers className={className} />
  if (i === 1) return <Flame className={className} />
  if (i === 2) return <Shield className={className} />
  return <Droplets className={className} />
}

function SiteConfigCard({
  config,
  onChange,
  attrNames,
  traitNames,
  title,
}: {
  config: SiteConfig
  onChange: (c: SiteConfig) => void
  attrNames: string[]
  traitNames: string[]
  title: string
}) {
  const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
  const randomFill = () => {
    const attrRanges: SiteConfig["attrRanges"] = [0, 1, 2].map(() => {
      const min = randomInt(1, 8)
      const width = randomInt(2, Math.min(4, 10 - min))
      return { min, max: min + width }
    }) as SiteConfig["attrRanges"]
    const desiredIdx = randomInt(0, Math.max(0, traitNames.length - 1))
    let undesiredIdx = randomInt(0, Math.max(0, traitNames.length - 1))
    if (traitNames.length > 1 && undesiredIdx === desiredIdx) undesiredIdx = (desiredIdx + 1) % traitNames.length
    onChange({
      attrRanges,
      desiredTrait: traitNames[desiredIdx] ?? "",
      undesiredTrait: traitNames[undesiredIdx] ?? "",
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-[#1a202c]">{title}</h3>
        <Button variant="outline" size="sm" onClick={randomFill}>
          Random fill
        </Button>
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((idx) => (
          <div key={`site-range-${idx}`} className="flex items-center gap-2">
            <span className="w-32 text-sm font-medium text-gray-700">{attrNames[idx] || `Attribute ${idx + 1}`}</span>
            <Input
              type="number"
              min={1}
              max={10}
              value={config.attrRanges[idx].min}
              onChange={(e) =>
                onChange({
                  ...config,
                  attrRanges: config.attrRanges.map((r, i) => (i === idx ? { ...r, min: parseNumericInput(e.target.value) } : r)) as SiteConfig["attrRanges"],
                })
              }
              className="w-20 border-2 border-[#94a3b8] text-center"
            />
            <span>-</span>
            <Input
              type="number"
              min={1}
              max={10}
              value={config.attrRanges[idx].max}
              onChange={(e) =>
                onChange({
                  ...config,
                  attrRanges: config.attrRanges.map((r, i) => (i === idx ? { ...r, max: parseNumericInput(e.target.value) } : r)) as SiteConfig["attrRanges"],
                })
              }
              className="w-20 border-2 border-[#94a3b8] text-center"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-gray-700">Desired trait</label>
          <select
            className="mt-1 w-full rounded-md border-2 border-[#94a3b8] bg-white px-3 py-2 text-sm"
            value={config.desiredTrait}
            onChange={(e) => onChange({ ...config, desiredTrait: e.target.value })}
          >
            {traitNames.map((t) => (
              <option key={`desired-${t}`} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Undesired trait</label>
          <select
            className="mt-1 w-full rounded-md border-2 border-[#94a3b8] bg-white px-3 py-2 text-sm"
            value={config.undesiredTrait}
            onChange={(e) => onChange({ ...config, undesiredTrait: e.target.value })}
          >
            {traitNames.map((t) => (
              <option key={`undesired-${t}`} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

export function SeawolfSolver() {
  const phaseCard = "rounded-xl border border-gray-200 bg-white/95 p-6 shadow-sm"
  const sectionCard = "rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm"
  const phaseChip = "mb-4 inline-flex rounded-full bg-[#eefcfb] px-3 py-1 text-sm font-semibold text-[#0f766e] ring-1 ring-[#cceeea]"
  const accentHeading = "border-l-4 border-[#4ECDC4] pl-3 text-lg font-bold text-[#1a202c]"
  const neutralButton = "border border-[#cbd5e1] bg-white text-[#1a202c] hover:bg-[#f8fafc]"
  const primaryButton = "bg-[#4ECDC4] text-[#1a202c] hover:bg-[#3fc0b8]"
  const dangerButton = "border border-red-300 bg-white text-red-700 hover:bg-red-50"

  const [activePhase, setActivePhase] = useState<PhaseKey>("phase4")
  const [attrNames, setAttrNames] = useState<[string, string, string]>(["Attribute 1", "Attribute 2", "Attribute 3"])
  const [traitNames, setTraitNames] = useState<[string, string, string, string]>(["Trait 1", "Trait 2", "Trait 3", "Trait 4"])

  const emptySiteConfig = (): SiteConfig => ({
    attrRanges: [
      { min: "", max: "" },
      { min: "", max: "" },
      { min: "", max: "" },
    ],
    desiredTrait: traitNames[0] ?? "",
    undesiredTrait: traitNames[1] ?? traitNames[0] ?? "",
  })

  const [siteInfoConfig, setSiteInfoConfig] = useState<SiteConfig>(emptySiteConfig())

  useEffect(() => {
    setSiteInfoConfig((prev) => ({
      ...prev,
      desiredTrait: prev.desiredTrait || traitNames[0] || "",
      undesiredTrait: prev.undesiredTrait || traitNames[1] || traitNames[0] || "",
    }))
  }, [traitNames])

  const getMicrobeAttr = (m: SolverMicrobe, idx: number) => (idx === 0 ? m.mobility : idx === 1 ? m.agility : m.size)
  const getPhase4RangeByIdx = (idx: number) => (idx === 0 ? targetRanges.mobility : idx === 1 ? targetRanges.agility : targetRanges.size)

  // Phase 1
  const phase1Extremes = useMemo(() => {
    const scored = [0, 1, 2]
      .map((idx) => {
        const r = siteInfoConfig.attrRanges[idx]
        if (typeof r.min !== "number" || typeof r.max !== "number") return null
        return { idx, score: Math.abs((r.min + r.max) / 2 - 5.5) }
      })
      .filter(Boolean) as { idx: number; score: number }[]
    if (!scored.length) return []
    const best = Math.max(...scored.map((x) => x.score))
    return scored.filter((x) => x.score === best).map((x) => x.idx)
  }, [siteInfoConfig])

  // Phase 2
  const [p2RevealType, setP2RevealType] = useState<"trait" | "attribute">("trait")
  const [p2RevealTrait, setP2RevealTrait] = useState<string>(traitNames[0])
  const [p2RevealAttrIdx, setP2RevealAttrIdx] = useState<number>(0)
  const [p2RevealMin, setP2RevealMin] = useState<NumericInputValue>("")
  const [p2RevealMax, setP2RevealMax] = useState<NumericInputValue>("")
  const [p2Current, setP2Current] = useState<SolverMicrobe>({
    mobility: 1,
    agility: 1,
    size: 1,
    trait: traitNames[0],
  })
  const [p2Index, setP2Index] = useState(0)
  const [p2Results, setP2Results] = useState<Phase2Result[]>([])

  useEffect(() => {
    if (!traitNames.includes(p2RevealTrait as (typeof traitNames)[number])) {
      setP2RevealTrait(traitNames[0] || "")
    }
    if (!traitNames.includes(p2Current.trait as (typeof traitNames)[number])) {
      setP2Current((prev) => ({ ...prev, trait: traitNames[0] || "" }))
    }
  }, [traitNames, p2Current.trait, p2RevealTrait])

  const p2SetupComplete =
    !!siteInfoConfig.desiredTrait &&
    !!siteInfoConfig.undesiredTrait &&
    (p2RevealType === "trait" || (typeof p2RevealMin === "number" && typeof p2RevealMax === "number"))

  const evaluateP2 = (m: SolverMicrobe): { result: Phase2Result["result"]; reason: string } => {
    const satisfiesSite2 =
      p2RevealType === "trait"
        ? m.trait === p2RevealTrait
        : isInRange(getMicrobeAttr(m, p2RevealAttrIdx), Number(p2RevealMin), Number(p2RevealMax))

    if (satisfiesSite2 && m.trait !== siteInfoConfig.undesiredTrait) {
      return {
        result: "NEXT SITE",
        reason:
          p2RevealType === "trait"
            ? `Satisfies next-site trait insight (${p2RevealTrait}).`
            : `Satisfies next-site insight (${attrNames[p2RevealAttrIdx]} ${p2RevealMin}-${p2RevealMax}).`,
      }
    }

    const completeRangeIdx = [0, 1, 2].filter((idx) => {
      const r = siteInfoConfig.attrRanges[idx]
      return typeof r.min === "number" && typeof r.max === "number"
    })
    const inRangeCount = completeRangeIdx.filter((idx) => {
      const r = siteInfoConfig.attrRanges[idx]
      return isInRange(getMicrobeAttr(m, idx), Number(r.min), Number(r.max))
    }).length
    const inviable = completeRangeIdx.some((idx) => {
      const r = siteInfoConfig.attrRanges[idx]
      return isInviableOnAttribute(getMicrobeAttr(m, idx), Number(r.min), Number(r.max))
    })
    const skipRangeChecks = completeRangeIdx.length === 0

    if (
      !satisfiesSite2 &&
      m.trait !== siteInfoConfig.undesiredTrait &&
      (skipRangeChecks || inRangeCount > 0) &&
      (skipRangeChecks || !inviable)
    ) {
      return {
        result: "CURRENT SITE",
        reason: skipRangeChecks ? "Fits current site by trait rule (ranges not provided)." : `Fits current site - ${inRangeCount} attribute(s) in range.`,
      }
    }

    return { result: "RETURN", reason: "Does not fit either site." }
  }

  const p2Preview = p2SetupComplete ? evaluateP2(p2Current) : null
  const pushP2Microbe = () => {
    if (!p2SetupComplete || p2Index >= 10) return
    const out = evaluateP2(p2Current)
    setP2Results((prev) => [...prev, { ...p2Current, result: out.result, reason: out.reason }])
    setP2Index((x) => Math.min(10, x + 1))
    setP2Current({ mobility: 1, agility: 1, size: 1, trait: traitNames[0] || "" })
  }

  // Phase 3
  const [p3Preloaded, setP3Preloaded] = useState<CandidateInput[]>(
    Array.from({ length: PHASE3_PRELOAD_COUNT }, blankCandidate)
  )
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
      setP3Preloaded((prev) => prev.map((c, i) => (i === idx ? { ...c, [key]: value } : c)))
      return
    }
    setP3Rounds((prev) =>
      prev.map((r, rIdx) =>
        rIdx === round ? r.map((c, i) => (i === idx ? { ...c, [key]: value } : c)) : r
      )
    )
  }

  const solveRound = (roundIdx: number) => {
    if (roundIdx !== p3UnlockedRound) return

    const completeRangeIdx = [0, 1, 2].filter((idx) => {
      const r = siteInfoConfig.attrRanges[idx]
      return typeof r.min === "number" && typeof r.max === "number"
    })

    const solved: CandidateSolved[] = p3Rounds[roundIdx].map((cand) => {
      const mobility = Number(cand.mobility)
      const agility = Number(cand.agility)
      const size = Number(cand.size)
      const values = [mobility, agility, size]

      const inviable = completeRangeIdx.some((idx) =>
        isInviableOnAttribute(values[idx], Number(siteInfoConfig.attrRanges[idx].min), Number(siteInfoConfig.attrRanges[idx].max))
      )

      const attrsInRange = completeRangeIdx.filter((idx) =>
        isInRange(values[idx], Number(siteInfoConfig.attrRanges[idx].min), Number(siteInfoConfig.attrRanges[idx].max))
      ).length

      const desiredPresent = cand.desired
      const undesiredAbsent = !cand.undesired
      const conditionsSatisfied = attrsInRange + (desiredPresent ? 1 : 0) + (undesiredAbsent ? 1 : 0)
      const negative = cand.undesired || inviable
      const neutralScore = attrsInRange / 3 + (desiredPresent && !inviable ? 0.5 : 0)

      return {
        input: cand,
        conditionsSatisfied,
        inviable,
        negative,
        neutralScore,
        classification: "NEUTRAL",
      }
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

  // Phase 4
  const [showAllOptimalCombos, setShowAllOptimalCombos] = useState(false)
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

  useEffect(() => {
    const [r1, r2, r3] = siteInfoConfig.attrRanges
    setTargetRanges({
      mobility: { min: r1.min, max: r1.max },
      agility: { min: r2.min, max: r2.max },
      size: { min: r3.min, max: r3.max },
    })
  }, [siteInfoConfig])

  const handleRangeChange = (attribute: keyof TargetRanges, field: "min" | "max", value: string) => {
    const numValue = parseNumericInput(value)
    setTargetRanges((prev) => ({
      ...prev,
      [attribute]: {
        ...prev[attribute],
        [field]: numValue,
      },
    }))
    const idx = attribute === "mobility" ? 0 : attribute === "agility" ? 1 : 2
    setSiteInfoConfig((prev) => ({
      ...prev,
      attrRanges: prev.attrRanges.map((r, i) => (i === idx ? { ...r, [field]: numValue } : r)) as SiteConfig["attrRanges"],
    }))
  }

  const handleMicrobeValueChange = (
    attribute: keyof Omit<Phase4MicrobeData, "desirable" | "undesirable">,
    index: number,
    value: string
  ) => {
    const numValue = parseNumericInput(value)
    setMicrobeData((prev) => ({
      ...prev,
      [attribute]: prev[attribute].map((v, i) => (i === index ? numValue : v)),
    }))
  }

  const handleCheckboxChange = (
    type: "desirable" | "undesirable",
    index: number,
    checked: boolean
  ) => {
    setMicrobeData((prev) => ({
      ...prev,
      [type]: prev[type].map((v, i) => (i === index ? checked : v)),
    }))
  }

  const handleMicrobeInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    microbeIndex: number,
    attributeIndex: number
  ) => {
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
    setTargetRanges({
      mobility: { min: "", max: "" },
      agility: { min: "", max: "" },
      size: { min: "", max: "" },
    })
    setSiteInfoConfig((prev) => ({
      ...prev,
      attrRanges: [
        { min: "", max: "" },
        { min: "", max: "" },
        { min: "", max: "" },
      ],
    }))
    setMicrobeData({
      mobility: Array(PHASE4_MICROBE_COUNT).fill(""),
      agility: Array(PHASE4_MICROBE_COUNT).fill(""),
      size: Array(PHASE4_MICROBE_COUNT).fill(""),
      desirable: Array(PHASE4_MICROBE_COUNT).fill(false),
      undesirable: Array(PHASE4_MICROBE_COUNT).fill(false),
    })
  }

  const randomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min

  const fillRandomInputs = () => {
    const randomRange = () => {
      const min = randomInt(1, 7)
      const maxDelta = Math.min(4, 10 - min)
      const delta = randomInt(2, maxDelta)
      return { min, max: min + delta }
    }

    setTargetRanges({
      mobility: randomRange(),
      agility: randomRange(),
      size: randomRange(),
    })

    setMicrobeData({
      mobility: Array.from({ length: PHASE4_MICROBE_COUNT }, () => randomInt(1, 10)),
      agility: Array.from({ length: PHASE4_MICROBE_COUNT }, () => randomInt(1, 10)),
      size: Array.from({ length: PHASE4_MICROBE_COUNT }, () => randomInt(1, 10)),
      desirable: Array.from({ length: PHASE4_MICROBE_COUNT }, () => Math.random() < 0.25),
      undesirable: Array.from({ length: PHASE4_MICROBE_COUNT }, () => Math.random() < 0.15),
    })
  }

  const randomFillP4Config = () => {
    const randomRange = () => {
      const min = randomInt(1, 7)
      const maxDelta = Math.min(4, 10 - min)
      const delta = randomInt(2, maxDelta)
      return { min, max: min + delta }
    }
    const nextRanges = {
      mobility: randomRange(),
      agility: randomRange(),
      size: randomRange(),
    }
    setTargetRanges(nextRanges)
    setSiteInfoConfig((prev) => ({
      ...prev,
      attrRanges: [
        { min: nextRanges.mobility.min, max: nextRanges.mobility.max },
        { min: nextRanges.agility.min, max: nextRanges.agility.max },
        { min: nextRanges.size.min, max: nextRanges.size.max },
      ],
    }))
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

  const areRangeInputsComplete = useMemo(
    () => Object.values(targetRanges).every((range) => range.min !== "" && range.max !== ""),
    [targetRanges]
  )

  const areMicrobeInputsComplete = useMemo(
    () =>
      microbeData.mobility.every((value) => value !== "") &&
      microbeData.agility.every((value) => value !== "") &&
      microbeData.size.every((value) => value !== ""),
    [microbeData]
  )

  const areAllInputsComplete = areRangeInputsComplete && areMicrobeInputsComplete

  const numericTargetRanges = useMemo(
    () => ({
      mobility: {
        min: Number(targetRanges.mobility.min),
        max: Number(targetRanges.mobility.max),
      },
      agility: {
        min: Number(targetRanges.agility.min),
        max: Number(targetRanges.agility.max),
      },
      size: {
        min: Number(targetRanges.size.min),
        max: Number(targetRanges.size.max),
      },
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
          const means = {
            mobility: (mobility[i] + mobility[j] + mobility[k]) / 3,
            agility: (agility[i] + agility[j] + agility[k]) / 3,
            size: (size[i] + size[j] + size[k]) / 3,
          }

          const checks = {
            mobilityInRange:
              means.mobility >= numericTargetRanges.mobility.min &&
              means.mobility <= numericTargetRanges.mobility.max,
            agilityInRange:
              means.agility >= numericTargetRanges.agility.min &&
              means.agility <= numericTargetRanges.agility.max,
            sizeInRange:
              means.size >= numericTargetRanges.size.min && means.size <= numericTargetRanges.size.max,
            desiredPresent: microbes.some((idx) => microbeData.desirable[idx]),
            undesiredAbsent: microbes.every((idx) => !microbeData.undesirable[idx]),
          }

          let score = 100
          if (!checks.mobilityInRange) score -= 20
          if (!checks.agilityInRange) score -= 20
          if (!checks.sizeInRange) score -= 20
          if (!checks.desiredPresent) score -= 20
          if (!checks.undesiredAbsent) score -= 20

          combos.push({
            microbes,
            score: Math.max(0, score),
            means,
            checks,
          })
        }
      }
    }

    return combos
  }, [areAllInputsComplete, microbeData, numericTargetRanges])

  const maxScore = useMemo(
    () => evaluations.reduce((best, combo) => Math.max(best, combo.score), 0),
    [evaluations]
  )

  const winningCombos = useMemo(
    () => evaluations.filter((combo) => combo.score === maxScore),
    [evaluations, maxScore]
  )
  const primaryWinningCombo = winningCombos[0] ?? null
  const highlightedColumns = useMemo(
    () => (areAllInputsComplete && maxScore > 0 && primaryWinningCombo ? new Set(primaryWinningCombo.microbes) : new Set<number>()),
    [areAllInputsComplete, maxScore, primaryWinningCombo]
  )

  const phaseItems: { key: PhaseKey; label: string; subtitle?: string }[] = [
    { key: "config", label: "Site Information" },
    { key: "phase1", label: "Phase 1 - Profiling" },
    { key: "phase2", label: "Phase 2 - Categorization" },
    { key: "phase3", label: "Phase 3 - Prospect Pool" },
    { key: "phase4", label: "Phase 4 - Treatment", subtitle: "Main Tool" },
  ]

  return (
    <div className="flex flex-row gap-4">
      <aside className="w-[190px] shrink-0 rounded-xl border border-[#e2e8f0] bg-white p-3 shadow-sm">
        <div className="space-y-1.5">
          {phaseItems.map((item) => {
            const active = activePhase === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActivePhase(item.key)}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                  active
                    ? "border-[#4ECDC4] bg-[#4ECDC4] text-white shadow-sm"
                    : "border-transparent bg-transparent text-gray-600 hover:border-[#cceeea] hover:bg-[#eefcfb] hover:text-[#0f766e]"
                )}
              >
                <div className={cn("font-semibold", item.key === "phase4" ? "text-[15px]" : "text-sm")}>{item.label}</div>
                {item.subtitle ? (
                  <div className={cn("text-[11px]", active ? "text-white/80" : "text-gray-400")}>⭐ {item.subtitle}</div>
                ) : null}
              </button>
            )
          })}
        </div>
      </aside>

      <div className="flex-1">
        {activePhase === "config" ? (
          <section className={phaseCard}>
            <div className={phaseChip}>Site Information</div>
            <h2 className={accentHeading}>Global Naming</h2>
            <div className="mt-4">
              <div className="text-sm font-semibold text-gray-700">Attribute Names</div>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {[0, 1, 2].map((idx) => (
                  <Input
                    key={`attr-name-${idx}`}
                    value={attrNames[idx]}
                    placeholder={`Attribute ${idx + 1}`}
                    onChange={(e) =>
                      setAttrNames((prev) =>
                        prev.map((v, i) => (i === idx ? e.target.value : v)) as [string, string, string]
                      )
                    }
                    className="border-2 border-[#94a3b8]"
                  />
                ))}
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm font-semibold text-gray-700">Trait Names</div>
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                {[0, 1, 2, 3].map((idx) => (
                  <Input
                    key={`trait-name-${idx}`}
                    value={traitNames[idx]}
                    placeholder={`Trait ${idx + 1}`}
                    onChange={(e) =>
                      setTraitNames((prev) =>
                        prev.map((v, i) => (i === idx ? e.target.value : v)) as [string, string, string, string]
                      )
                    }
                    className="border-2 border-[#94a3b8]"
                  />
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              These names are used across all phases. Leave blank to use defaults.
            </p>
            <div className="mt-5">
              <SiteConfigCard
                config={siteInfoConfig}
                onChange={setSiteInfoConfig}
                attrNames={attrNames}
                traitNames={traitNames}
                title="Site Characteristics"
              />
            </div>
          </section>
        ) : null}

        {activePhase === "phase1" ? (
          <section className="space-y-4">
            <SiteConfigCard
              config={siteInfoConfig}
              onChange={setSiteInfoConfig}
              attrNames={attrNames}
              traitNames={traitNames}
              title="Site Characteristics"
            />
            <div className={phaseCard}>
              <div className={phaseChip}>Phase 1 · Profiling</div>
              <h2 className={accentHeading}>Phase 1 Solver</h2>
              {siteInfoConfig.desiredTrait || phase1Extremes.length ? (
                <div className="mt-5 space-y-3 text-sm">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm">
                    <div className="font-semibold">Pick this trait:</div>
                    <div
                      className="mt-1 inline-flex items-center gap-2 font-semibold"
                      style={{
                        color: traitColor(
                          siteInfoConfig.desiredTrait,
                          Math.max(0, traitNames.indexOf(siteInfoConfig.desiredTrait as (typeof traitNames)[number]))
                        ),
                      }}
                    >
                      {traitIcon(
                        siteInfoConfig.desiredTrait,
                        Math.max(0, traitNames.indexOf(siteInfoConfig.desiredTrait as (typeof traitNames)[number]))
                      )}
                      <span>{siteInfoConfig.desiredTrait || "-"}</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm">
                    <div className="font-semibold">Pick this attribute:</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {phase1Extremes.length ? (
                        phase1Extremes.map((idx) => (
                          <span
                            key={`p1-attr-${idx}`}
                            className="rounded-full bg-[#eefcfb] px-2 py-1 font-semibold text-[#0f766e]"
                          >
                            {attrNames[idx] || `Attribute ${idx + 1}`}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500">Enter at least one complete attribute range.</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm">
                    <div className="font-semibold">Set the slider to:</div>
                    {phase1Extremes.map((idx) => {
                      const r = siteInfoConfig.attrRanges[idx]
                      return (
                        <div key={`p1-range-${idx}`} className="mt-1 text-gray-700">
                          {attrNames[idx] || `Attribute ${idx + 1}`}: {r.min} - {r.max}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-500">Fill site characteristics to see recommendations.</p>
              )}
            </div>
          </section>
        ) : null}

        {activePhase === "phase2" ? (
          <section className="space-y-4">
            <SiteConfigCard
              config={siteInfoConfig}
              onChange={setSiteInfoConfig}
              attrNames={attrNames}
              traitNames={traitNames}
              title="Site 1 Characteristics"
            />
            <div className={phaseCard}>
              <div className={phaseChip}>Phase 2 · Categorization</div>
              <h2 className={accentHeading}>Revealed Characteristic About Site 2</h2>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <label>
                  <input
                    type="radio"
                    className="mr-1"
                    checked={p2RevealType === "trait"}
                    onChange={() => setP2RevealType("trait")}
                  />
                  Trait
                </label>
                <label>
                  <input
                    type="radio"
                    className="mr-1"
                    checked={p2RevealType === "attribute"}
                    onChange={() => setP2RevealType("attribute")}
                  />
                  Attribute
                </label>
              </div>
              {p2RevealType === "trait" ? (
                <select
                  className="mt-2 w-full rounded-md border-2 border-[#94a3b8] bg-white px-3 py-2 text-sm"
                  value={p2RevealTrait}
                  onChange={(e) => setP2RevealTrait(e.target.value)}
                >
                  {traitNames.map((t) => (
                    <option key={`p2-reveal-trait-${t}`} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <select
                    className="rounded-md border-2 border-[#94a3b8] bg-white px-2 py-2 text-sm"
                    value={p2RevealAttrIdx}
                    onChange={(e) => setP2RevealAttrIdx(Number(e.target.value))}
                  >
                    {[0, 1, 2].map((idx) => (
                      <option key={`p2-reveal-attr-${idx}`} value={idx}>
                        {attrNames[idx] || `Attribute ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={p2RevealMin}
                    onChange={(e) => setP2RevealMin(parseNumericInput(e.target.value))}
                    className="border-2 border-[#94a3b8]"
                    placeholder="Min"
                  />
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={p2RevealMax}
                    onChange={(e) => setP2RevealMax(parseNumericInput(e.target.value))}
                    className="border-2 border-[#94a3b8]"
                    placeholder="Max"
                  />
                </div>
              )}
            </div>
            <div className={phaseCard}>
              <h3 className="text-lg font-bold text-[#1a202c]">
                Microbe {Math.min(p2Index + 1, 10)} of 10
              </h3>
              {!p2SetupComplete ? (
                <p className="mt-2 text-sm text-gray-500">Complete setup above to unlock microbe categorization.</p>
              ) : p2Index >= 10 ? (
                <p className="mt-2 text-sm font-semibold text-emerald-700">All 10 microbes processed.</p>
              ) : (
                <>
                  <div className="mt-3 grid gap-2 md:grid-cols-4">
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={p2Current.mobility}
                      onChange={(e) =>
                        setP2Current((p) => ({ ...p, mobility: Number(parseNumericInput(e.target.value) || 1) }))
                      }
                      className="border-2 border-[#94a3b8]"
                      placeholder={attrNames[0] || "Attribute 1"}
                      onKeyDown={(e) => e.key === "Enter" && pushP2Microbe()}
                    />
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={p2Current.agility}
                      onChange={(e) =>
                        setP2Current((p) => ({ ...p, agility: Number(parseNumericInput(e.target.value) || 1) }))
                      }
                      className="border-2 border-[#94a3b8]"
                      placeholder={attrNames[1] || "Attribute 2"}
                      onKeyDown={(e) => e.key === "Enter" && pushP2Microbe()}
                    />
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={p2Current.size}
                      onChange={(e) =>
                        setP2Current((p) => ({ ...p, size: Number(parseNumericInput(e.target.value) || 1) }))
                      }
                      className="border-2 border-[#94a3b8]"
                      placeholder={attrNames[2] || "Attribute 3"}
                      onKeyDown={(e) => e.key === "Enter" && pushP2Microbe()}
                    />
                    <select
                      className="rounded-md border-2 border-[#94a3b8] bg-white px-3 py-2 text-sm"
                      value={p2Current.trait}
                      onChange={(e) => setP2Current((p) => ({ ...p, trait: e.target.value }))}
                    >
                      {traitNames.map((t) => (
                        <option key={`p2-trait-${t}`} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  {p2Preview ? (
                    <div className="mt-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide",
                          p2Preview.result === "CURRENT SITE"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                            : p2Preview.result === "NEXT SITE"
                              ? "border-blue-300 bg-blue-50 text-blue-800"
                              : "border-red-300 bg-red-50 text-red-700"
                        )}
                      >
                        {p2Preview.result}
                      </span>
                      <p className="mt-1 text-sm text-gray-700">{p2Preview.reason}</p>
                    </div>
                  ) : null}
                  <Button className={cn("mt-3", primaryButton)} onClick={pushP2Microbe}>
                    Next microbe
                  </Button>
                </>
              )}
              {p2Results.length > 0 ? (
                <div className="mt-5">
                  <div className="mb-2 text-sm font-semibold text-gray-800">Summary</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f8fffe] text-gray-600">
                        <tr>
                          <th>#</th>
                          <th>{attrNames[0] || "A1"}</th>
                          <th>{attrNames[1] || "A2"}</th>
                          <th>{attrNames[2] || "A3"}</th>
                          <th>Trait</th>
                          <th>Result</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p2Results.map((r, i) => (
                          <tr key={`p2-r-${i}`} className="border-t border-gray-200 bg-white">
                            <td>{i + 1}</td>
                            <td>{r.mobility}</td>
                            <td>{r.agility}</td>
                            <td>{r.size}</td>
                            <td>{r.trait}</td>
                            <td className="font-semibold">{r.result}</td>
                            <td>{r.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    variant="outline"
                    className={cn("mt-3", neutralButton)}
                    onClick={() => {
                      setP2Index(0)
                      setP2Results([])
                      setP2Current({ mobility: 1, agility: 1, size: 1, trait: traitNames[0] || "" })
                    }}
                  >
                    Start over
                  </Button>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {activePhase === "phase3" ? (
          <section className="space-y-4">
            <SiteConfigCard
              config={siteInfoConfig}
              onChange={setSiteInfoConfig}
              attrNames={attrNames}
              traitNames={traitNames}
              title="Site Characteristics"
            />
            <div className={phaseCard}>
              <div className={phaseChip}>Phase 3 · Prospect Pool</div>
              <h3 className="text-base font-bold text-[#1a202c]">Preloaded Pool (P1-P6)</h3>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {p3Preloaded.map((m, idx) => (
                  <div key={`p3-pre-${idx}`} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="mb-2 text-xs font-bold text-gray-700">P{idx + 1}</div>
                    <div className="grid grid-cols-3 gap-1">
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={m.mobility}
                        onChange={(e) =>
                          updateP3Candidate("pre", 0, idx, "mobility", parseNumericInput(e.target.value))
                        }
                        className="border-2 border-[#94a3b8]"
                      />
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={m.agility}
                        onChange={(e) =>
                          updateP3Candidate("pre", 0, idx, "agility", parseNumericInput(e.target.value))
                        }
                        className="border-2 border-[#94a3b8]"
                      />
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={m.size}
                        onChange={(e) => updateP3Candidate("pre", 0, idx, "size", parseNumericInput(e.target.value))}
                        className="border-2 border-[#94a3b8]"
                      />
                    </div>
                    <div className="mt-2 flex gap-3 text-xs">
                      <label className="flex items-center gap-1">
                        <Checkbox
                          checked={m.desired}
                          onCheckedChange={(v) => updateP3Candidate("pre", 0, idx, "desired", v === true)}
                        />
                        Desired
                      </label>
                      <label className="flex items-center gap-1">
                        <Checkbox
                          checked={m.undesired}
                          onCheckedChange={(v) => updateP3Candidate("pre", 0, idx, "undesired", v === true)}
                        />
                        Undesired
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {Array.from({ length: PHASE3_ROUNDS }, (_, roundIdx) => {
              const unlocked = roundIdx <= p3UnlockedRound
              const solved = p3Solved[roundIdx]
              return (
                <div key={`p3-round-${roundIdx}`} className={phaseCard}>
                  <h3 className="text-base font-bold text-[#1a202c]">Round {roundIdx + 1}</h3>
                  {!unlocked ? (
                    <p className="mt-2 text-sm text-gray-500">Complete previous round to unlock.</p>
                  ) : null}
                  {unlocked ? (
                    <>
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        {p3Rounds[roundIdx].map((cand, candIdx) => {
                          const solvedCard = solved?.candidates[candIdx]
                          return (
                            <div
                              key={`cand-${roundIdx}-${candIdx}`}
                              className={cn(
                                "rounded-lg border p-3",
                                solved && solved.recommendedIndex === candIdx
                                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                                  : "border-gray-200 bg-white"
                              )}
                            >
                              <div className="mb-2 text-xs font-bold text-gray-700">Candidate {candIdx + 1}</div>
                              <div className="grid grid-cols-3 gap-1">
                                <Input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={cand.mobility}
                                  onChange={(e) =>
                                    updateP3Candidate(
                                      "round",
                                      roundIdx,
                                      candIdx,
                                      "mobility",
                                      parseNumericInput(e.target.value)
                                    )
                                  }
                                  className="border-2 border-[#94a3b8]"
                                />
                                <Input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={cand.agility}
                                  onChange={(e) =>
                                    updateP3Candidate(
                                      "round",
                                      roundIdx,
                                      candIdx,
                                      "agility",
                                      parseNumericInput(e.target.value)
                                    )
                                  }
                                  className="border-2 border-[#94a3b8]"
                                />
                                <Input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={cand.size}
                                  onChange={(e) =>
                                    updateP3Candidate("round", roundIdx, candIdx, "size", parseNumericInput(e.target.value))
                                  }
                                  className="border-2 border-[#94a3b8]"
                                />
                              </div>
                              <div className="mt-2 flex gap-3 text-xs">
                                <label className="flex items-center gap-1">
                                  <Checkbox
                                    checked={cand.desired}
                                    onCheckedChange={(v) =>
                                      updateP3Candidate("round", roundIdx, candIdx, "desired", v === true)
                                    }
                                  />
                                  Desired
                                </label>
                                <label className="flex items-center gap-1">
                                  <Checkbox
                                    checked={cand.undesired}
                                    onCheckedChange={(v) =>
                                      updateP3Candidate("round", roundIdx, candIdx, "undesired", v === true)
                                    }
                                  />
                                  Undesired
                                </label>
                              </div>
                              {solvedCard ? (
                                <div className="mt-2 space-y-1 text-xs">
                                  <span
                                    className={cn(
                                      "inline-flex rounded-full px-2 py-0.5 font-bold",
                                      solvedCard.classification === "OPTIMAL"
                                        ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
                                        : solvedCard.classification === "NEUTRAL"
                                          ? "border border-amber-300 bg-amber-50 text-amber-800"
                                          : "border border-red-300 bg-red-50 text-red-700"
                                    )}
                                  >
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
                        <Button className={cn("mt-3", primaryButton)} onClick={() => solveRound(roundIdx)}>
                          Solve round
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              )
            })}
            {p3Solved.length === PHASE3_ROUNDS ? (
              <div className={phaseCard}>
                <h3 className="text-base font-bold text-[#1a202c]">Final Recommended Pool (10)</h3>
                <div className="mt-2 text-sm text-gray-700">
                  Preloaded: 6 microbes + Picks from rounds:{" "}
                  {p3Solved.map((r, i) => `R${i + 1} C${r.recommendedIndex + 1}`).join(", ")}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {activePhase === "phase4" ? (
          <section className="space-y-2">
            <div className={phaseChip}>Phase 4 · Treatment</div>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1.25fr_0.55fr_0.95fr]">
              <div className="rounded-xl border border-[#e2e8f0] bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className={accentHeading}>Target Ranges</h3>
                  <Button variant="outline" size="sm" className={neutralButton} onClick={randomFillP4Config}>
                    Random fill
                  </Button>
                </div>
                <div className="space-y-2">
                  {[0, 1, 2].map((idx) => {
                    const key = PHASE4_ATTRIBUTE_KEYS[idx]
                    return (
                      <div key={`p4-range-${idx}`} className="flex items-center gap-2">
                        <span className="w-28 text-sm font-medium text-[#374151]">{attrNames[idx] || `Attribute ${idx + 1}`}</span>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={targetRanges[key].min}
                          onChange={(e) => handleRangeChange(key, "min", e.target.value)}
                          className="h-8 w-14 border-2 border-[#94a3b8] text-center"
                        />
                        <span>-</span>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={targetRanges[key].max}
                          onChange={(e) => handleRangeChange(key, "max", e.target.value)}
                          className="h-8 w-14 border-2 border-[#94a3b8] text-center"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-[#e2e8f0] bg-white p-3 shadow-sm">
                <h3 className={accentHeading}>Max Score</h3>
                {areAllInputsComplete && primaryWinningCombo ? (
                  <div className="space-y-2">
                    <p
                      className={cn(
                        "text-6xl font-extrabold leading-none",
                        maxScore === 100 ? "text-[#16a34a]" : maxScore === 80 ? "text-[#d97706]" : "text-[#dc2626]"
                      )}
                    >
                      {maxScore}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {primaryWinningCombo.microbes.map((idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-[#2563eb] px-2 py-0.5 text-xs font-semibold text-white shadow-sm"
                        >
                          M{idx + 1}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="text-[11px] text-blue-600 hover:underline"
                      onClick={() => setShowAllOptimalCombos((p) => !p)}
                    >
                      {showAllOptimalCombos ? "Hide all optimal combinations" : "All optimal combinations"}
                    </button>
                    {showAllOptimalCombos ? (
                      <div className="max-h-24 space-y-1 overflow-auto pr-1">
                        {winningCombos.map((combo) => (
                          <div key={combo.microbes.join("-")} className="text-[11px] text-gray-600">
                            {combo.microbes.map((m) => `M${m + 1}`).join(", ")}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <p className="text-[10px] text-gray-500">A score of 100 is not always possible. However, we recommend double-checking your inputs.</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Fill all ranges and microbe values to evaluate all 120 combinations.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-[#e2e8f0] bg-white p-3 shadow-sm">
                <h3 className={accentHeading}>Conditions</h3>
                {areAllInputsComplete && primaryWinningCombo ? (
                  <ul className="space-y-1.5">
                    {[
                      {
                        label: `${attrNames[0] || "Attribute 1"} mean in range`,
                        icon: <Grid3X3 className="h-3.5 w-3.5" />,
                        mean: primaryWinningCombo.means.mobility.toFixed(2),
                        pass: primaryWinningCombo.checks.mobilityInRange,
                      },
                      {
                        label: `${attrNames[1] || "Attribute 2"} mean in range`,
                        icon: <Zap className="h-3.5 w-3.5" />,
                        mean: primaryWinningCombo.means.agility.toFixed(2),
                        pass: primaryWinningCombo.checks.agilityInRange,
                      },
                      {
                        label: `${attrNames[2] || "Attribute 3"} mean in range`,
                        icon: <Ruler className="h-3.5 w-3.5" />,
                        mean: primaryWinningCombo.means.size.toFixed(2),
                        pass: primaryWinningCombo.checks.sizeInRange,
                      },
                      {
                        label: "Desired trait present",
                        icon: traitIcon(
                          traitNames[0] || "",
                          Math.max(0, traitNames.indexOf((traitNames[0] || "") as (typeof traitNames)[number])),
                          "h-3.5 w-3.5"
                        ),
                        mean: null,
                        pass: primaryWinningCombo.checks.desiredPresent,
                      },
                      {
                        label: "Undesired trait absent",
                        icon: traitIcon(
                          traitNames[1] || "",
                          Math.max(0, traitNames.indexOf((traitNames[1] || "") as (typeof traitNames)[number])),
                          "h-3.5 w-3.5"
                        ),
                        mean: null,
                        pass: primaryWinningCombo.checks.undesiredAbsent,
                      },
                    ].map((check) => (
                      <li key={check.label} className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2 text-[11px]">
                          <span className="text-gray-600">{check.icon}</span>
                          <span className={check.pass ? "text-gray-900" : "text-gray-500"}>{check.label}</span>
                          {check.mean ? <span className="font-bold text-gray-800">{check.mean}</span> : null}
                        </div>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm",
                            check.pass ? "bg-[#16a34a]" : "bg-[#dc2626]"
                          )}
                        >
                          {check.pass ? "PASS" : "FAIL"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Results appear after all inputs are complete.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className={accentHeading}>Microbe Data</h3>
                <div className="flex gap-2">
                  <div className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb] hover:text-white"
                      onClick={fillRandomInputs}
                    >
                      Random Input
                    </Button>
                    <p className="mt-1 text-[10px] text-gray-500">Ctrl+Shift+F</p>
                  </div>
                  <div className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn("h-10", dangerButton)}
                      onClick={clearAllInputs}
                    >
                      Clear All
                    </Button>
                    <p className="mt-1 text-[10px] text-gray-500">Ctrl+Shift+R</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-5">
                {Array.from({ length: PHASE4_MICROBE_COUNT }, (_, idx) => (
                  <div
                    key={`p4-card-${idx}`}
                    className={cn(
                      "rounded-lg border border-[#cbd5e1] bg-[#f8fbff] p-2 shadow-inner",
                      highlightedColumns.has(idx) && "border-[#16a34a] bg-[#dcfce7]"
                    )}
                  >
                    <div className="mb-1 flex justify-center">
                      <span
                        className={cn(
                          "inline-flex min-w-7 justify-center rounded px-1 py-0.5 text-[10px] font-semibold text-white",
                          idx < 5 ? "bg-[#2563eb]" : "bg-[#6366f1]",
                          highlightedColumns.has(idx) && "bg-[#16a34a]"
                        )}
                      >
                        M{idx + 1}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {[0, 1, 2].map((attrIndex) => {
                        const key = PHASE4_ATTRIBUTE_KEYS[attrIndex]
                        return (
                          <div key={`p4-card-${idx}-attr-${attrIndex}`} className="grid grid-cols-[1fr_auto] items-center gap-1">
                            <span className="truncate text-[10px] font-semibold text-[#374151]">
                              {attrNames[attrIndex] || `Attribute ${attrIndex + 1}`}
                            </span>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={microbeData[key][idx]}
                              onChange={(e) => handleMicrobeValueChange(key, idx, e.target.value)}
                              onKeyDown={(e) => handleMicrobeInputKeyDown(e, idx, attrIndex)}
                              data-microbe-index={idx}
                              data-attribute-index={attrIndex}
                              className="h-6 w-14 border-2 border-[#94a3b8] px-1 text-center text-[10px] font-medium"
                            />
                          </div>
                        )
                      })}
                      <div className="grid grid-cols-[1fr_auto] items-center gap-1">
                        <span className="truncate text-[10px] font-semibold text-[#374151]">Desired</span>
                        <div className="flex h-6 w-14 items-center justify-center rounded-md border bg-white">
                          <Checkbox
                            checked={microbeData.desirable[idx]}
                            onCheckedChange={(v) => handleCheckboxChange("desirable", idx, v === true)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_auto] items-center gap-1">
                        <span className="truncate text-[10px] font-semibold text-[#374151]">Undesired</span>
                        <div className="flex h-6 w-14 items-center justify-center rounded-md border bg-white">
                          <Checkbox
                            checked={microbeData.undesirable[idx]}
                            onCheckedChange={(v) => handleCheckboxChange("undesirable", idx, v === true)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
