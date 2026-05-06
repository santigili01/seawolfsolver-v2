"use client"

/**
 * Full-session Seawolf simulator: /game
 * Standalone simulator routes are untouched; phases are inlined wrappers here.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, Droplets, Flame, Layers, LogOut, Settings, Shield } from "lucide-react"
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
  type Phase0DecisionInput,
  type Phase2DecisionRow,
  type Phase4MicrobeInput,
  type Phase4Score,
  type GameScore,
  type Phase3Candidate,
  type SiteScore,
} from "@/lib/game-scoring"

// ─── shared types ─────────────────────────────────────────────────────────────

export type Microbe = {
  id: string
  name: string
  Mobility: number
  Agility: number
  Size: number
  trait: string
}

type ScenarioRequirements = {
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

type ScenariosFile = {
  traits: string[]
  attributes: string[]
  scenarios: ScenarioRequirements[]
}

type CategorizationPool = {
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

type CatPoolsFile = Record<string, CategorizationPool[]>

type ProspectRoundJson = {
  round: number
  is_trap_round: boolean
  candidates: {
    microbe: Microbe
    classification: "optimal" | "neutral" | "negative"
    neutral_score: number | null
    conditions_satisfied: number
  }[]
}

type ProspectScenarioJson = {
  phase2_id: string
  source_pool_id: string
  scenario_name: string
  preloaded_microbes: Microbe[]
  choose_sets: ProspectRoundJson[]
  optimal_final_pool: Microbe[]
  optimal_max_score: number
  original_max_score: number
}

type ProspectPoolsFile = Record<string, ProspectScenarioJson[]>

type GameStep =
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

type GameConfig = {
  scenarios: [ScenarioRequirements, ScenarioRequirements, ScenarioRequirements]
  catPool12: CategorizationPool
  catPool23: CategorizationPool
  /** Phase 2 for site 3 — key "C__*" in JSON */
  catPoolSite3: CategorizationPool
  prospectA: ProspectScenarioJson
  prospectB: ProspectScenarioJson
  prospectC: ProspectScenarioJson
}

type PartialSiteAccumulator = {
  siteNumber: 1 | 2 | 3
  scenarioName: string
  phase1Result: import("@/lib/game-scoring").Phase1Score | null
  phase1Selections: GSelectionItem[]
  phase2Result: import("@/lib/game-scoring").Phase2Score | null
  phase0Result: import("@/lib/game-scoring").Phase0Score | null
  phase3Result: import("@/lib/game-scoring").Phase3Score | null
  phase4Result: Phase4Score | null
  phase3Pool: Microbe[]
}

const TIMER_START = 30 * 60
const ATTR_NAMES = ["Mobility", "Agility", "Size"] as const

// ─── scenario selection ──────────────────────────────────────────────────────

function randomPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function poolKey(a: string, b: string) {
  return `${a}__${b}`
}

function pickScenarioChain(
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

function scenarioToSiteReq(s: ScenarioRequirements): GSiteRequirements {
  return {
    attributes: s.attributes,
    desired_trait: s.desired_trait,
    undesired_trait: s.undesired_trait,
  }
}

function correctP2Choice(
  pool: CategorizationPool,
  id: string,
): "site1" | "site2" | "return" {
  if (pool.correct_categorization.site1.some((x) => x.id === id)) return "site1"
  if (pool.correct_categorization.site2.some((x) => x.id === id)) return "site2"
  return "return"
}

function correctP2Reason(pool: CategorizationPool, id: string): string {
  const all = [
    ...pool.correct_categorization.site1.map((x) => ({ ...x, c: "site1" as const })),
    ...pool.correct_categorization.site2.map((x) => ({ ...x, c: "site2" as const })),
    ...pool.correct_categorization.return.map((x) => ({ ...x, c: "return" as const })),
  ]
  return all.find((x) => x.id === id)?.reason ?? ""
}

function isExtremeRange(min: number, max: number) {
  return min <= 3 || max >= 8
}

function attrSpanWidth(min: number, max: number) {
  return max - min + 1
}

function computeOptimalProfilingPicks(scenario: ScenarioRequirements): GSelectionItem[] {
  type AttrN = (typeof ATTR_NAMES)[number]
  const extreme = ATTR_NAMES.filter((n) =>
    isExtremeRange(scenario.attributes[n].min, scenario.attributes[n].max),
  )
    .map((n: AttrN) => ({
      type: "attribute" as const,
      name: n,
      width: attrSpanWidth(scenario.attributes[n].min, scenario.attributes[n].max),
    }))
    .sort((a, b) => a.width - b.width)

  if (extreme.length >= 2) {
    return [
      { type: "attribute", name: extreme[0]!.name },
      { type: "attribute", name: extreme[1]!.name },
    ]
  }
  if (extreme.length === 1) {
    return [
      { type: "attribute", name: extreme[0]!.name },
      { type: "trait", name: scenario.desired_trait },
    ]
  }
  const rest = ATTR_NAMES.map((n: AttrN) => ({
    type: "attribute" as const,
    name: n,
    width: attrSpanWidth(scenario.attributes[n].min, scenario.attributes[n].max),
  })).sort((a, b) => a.width - b.width)

  return [
    { type: "trait", name: scenario.desired_trait },
    { type: "attribute", name: rest[0]!.name },
  ]
}

function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")} min`
}

function formatMmSs(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

// ─── visuals (mirrors simulator/page.tsx essentials) ─────────────────────────

function hashHue(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h) % 360
}

function traitColor(trait: string) {
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

function traitChipBg(trait: string) {
  const c = traitColor(trait)
  return c.startsWith("#") ? `${c}22` : `color-mix(in srgb, ${c} 18%, transparent)`
}

function traitIcon(trait: string, className = "h-4 w-4") {
  switch (trait) {
    case "Thermophilic":
      return <Flame className={className} />
    case "Metal-tolerant":
      return <Shield className={className} />
    case "Biofilm-forming":
      return <Layers className={className} />
    case "Halophobic":
      return <Droplets className={className} />
    default:
      return <Layers className={className} />
  }
}

function Tooltip({ children, text }: { children: ReactNode; text: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 max-w-xs -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-left text-xs whitespace-normal text-white">
          {text}
        </span>
      )}
    </span>
  )
}

function TraitBadgeChip({
  trait,
  chipClassName = "h-6 w-6",
}: {
  trait: string
  chipClassName?: string
}) {
  const tc = traitColor(trait)
  return (
    <Tooltip text={trait}>
      <span
        className={`inline-flex shrink-0 cursor-default items-center justify-center rounded-full ${chipClassName}`}
        style={{
          backgroundColor: traitChipBg(trait),
          color: tc,
        }}
      >
        {traitIcon(trait, "h-3.5 w-3.5")}
      </span>
    </Tooltip>
  )
}

const MICROBE_PALETTE = [
  "#FF6B6B",
  "#4ECDC4",
  "#FFE66D",
  "#95E1D3",
  "#F38181",
  "#AA96DA",
  "#FCBAD3",
  "#A8D8EA",
  "#C3EDC0",
  "#FFD93D",
]

const MicrobeBlob1 = ({ color = "#FF6B6B" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="40" rx="30" ry="25" fill={color} />
    <circle cx="30" cy="35" r="4" fill="white" opacity="0.6" />
    <path d="M15 40 Q5 35 8 25" stroke={color} strokeWidth="3" fill="none" />
    <path d="M65 40 Q75 35 72 25" stroke={color} strokeWidth="3" fill="none" />
  </svg>
)
const MicrobeBlob2 = ({ color = "#4ECDC4" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 10 Q70 20 65 50 Q60 75 40 70 Q20 75 15 50 Q10 20 40 10" fill={color} />
    <circle cx="35" cy="30" r="3" fill="white" opacity="0.5" />
    <path d="M40 70 L40 78" stroke={color} strokeWidth="2" />
    <path d="M35 68 L32 76" stroke={color} strokeWidth="2" />
    <path d="M45 68 L48 76" stroke={color} strokeWidth="2" />
  </svg>
)
const MicrobeBlob3 = ({ color = "#FFE66D" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <circle cx="40" cy="40" r="20" fill={color} />
    <circle cx="25" cy="25" r="8" fill={color} />
    <circle cx="55" cy="25" r="6" fill={color} />
    <circle cx="55" cy="55" r="7" fill={color} />
    <circle cx="25" cy="55" r="5" fill={color} />
  </svg>
)
const MicrobeBlob4 = ({ color = "#95E1D3" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="45" rx="25" ry="20" fill={color} />
    <path d="M20 30 Q15 15 25 10" stroke={color} strokeWidth="3" fill="none" />
    <path d="M60 30 Q65 15 55 10" stroke={color} strokeWidth="3" fill="none" />
    <circle cx="35" cy="40" r="3" fill="white" opacity="0.6" />
  </svg>
)
const MicrobeBlob5 = ({ color = "#F38181" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 15 L55 30 L55 50 L40 65 L25 50 L25 30 Z" fill={color} />
    <circle cx="40" cy="40" r="8" fill="white" opacity="0.3" />
    <path d="M40 15 L40 5" stroke={color} strokeWidth="2" />
    <path d="M55 30 L65 25" stroke={color} strokeWidth="2" />
    <path d="M25 30 L15 25" stroke={color} strokeWidth="2" />
  </svg>
)
const MicrobeBlob6 = ({ color = "#AA96DA" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="40" rx="28" ry="18" fill={color} />
    <path d="M12 40 Q5 40 8 50" stroke={color} strokeWidth="3" fill="none" />
    <path d="M68 40 Q75 40 72 50" stroke={color} strokeWidth="3" fill="none" />
    <circle cx="30" cy="38" r="4" fill="white" opacity="0.5" />
    <circle cx="50" cy="38" r="4" fill="white" opacity="0.5" />
  </svg>
)
const MicrobeBlob7 = ({ color = "#FCBAD3" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <circle cx="40" cy="40" r="22" fill={color} />
    <circle cx="40" cy="40" r="12" fill="white" opacity="0.2" />
    <path d="M40 18 L40 8 M45 10 L40 8 L35 10" stroke={color} strokeWidth="2" fill="none" />
  </svg>
)
const MicrobeBlob8 = ({ color = "#A8D8EA" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M25 40 Q25 20 40 20 Q55 20 55 40 Q55 60 40 60 Q25 60 25 40" fill={color} />
    <ellipse cx="40" cy="40" rx="8" ry="12" fill="white" opacity="0.3" />
    <circle cx="18" cy="35" r="5" fill={color} />
    <circle cx="62" cy="35" r="5" fill={color} />
  </svg>
)
const MicrobeBlob9 = ({ color = "#C3EDC0" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="42" rx="22" ry="18" fill={color} />
    <path d="M30 24 Q28 12 35 8" stroke={color} strokeWidth="3" fill="none" />
    <path d="M50 24 Q52 12 45 8" stroke={color} strokeWidth="3" fill="none" />
    <path d="M40 60 L40 72" stroke={color} strokeWidth="3" fill="none" />
  </svg>
)
const MicrobeBlob10 = ({ color = "#FFD93D" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <circle cx="40" cy="40" r="18" fill={color} />
    <circle cx="22" cy="30" r="6" fill={color} />
    <circle cx="58" cy="30" r="6" fill={color} />
    <circle cx="22" cy="50" r="6" fill={color} />
    <circle cx="58" cy="50" r="6" fill={color} />
    <circle cx="40" cy="40" r="6" fill="white" opacity="0.4" />
  </svg>
)

const microbeComponents = [
  MicrobeBlob1,
  MicrobeBlob2,
  MicrobeBlob3,
  MicrobeBlob4,
  MicrobeBlob5,
  MicrobeBlob6,
  MicrobeBlob7,
  MicrobeBlob8,
  MicrobeBlob9,
  MicrobeBlob10,
]

function blobIdx(pool: Microbe[], id: string) {
  const i = pool.findIndex((m) => m.id === id)
  return Math.max(0, i)
}

function MicrobeSvgFor(m: Microbe, pool: Microbe[]) {
  const idx = blobIdx(pool, m.id)
  const Svg = microbeComponents[idx % microbeComponents.length]!
  const c = MICROBE_PALETTE[idx % MICROBE_PALETTE.length] ?? "#888"
  return <Svg color={c} />
}

function attributeKeyIcon(attribute: string) {
  switch (attribute) {
    case "Mobility":
      return (
        <svg className="h-4 w-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="1" width="4" height="4" />
          <rect x="6" y="1" width="4" height="4" />
          <rect x="11" y="1" width="4" height="4" />
          <rect x="1" y="6" width="4" height="4" />
          <rect x="6" y="6" width="4" height="4" />
        </svg>
      )
    case "Agility":
      return (
        <svg className="h-4 w-4 text-yellow-500" viewBox="0 0 16 16" fill="currentColor">
          <path d="M9 1L4 9h4l-1 6 5-8H8l1-6z" />
        </svg>
      )
    case "Size":
      return (
        <svg className="h-4 w-4 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1 15L1 1L15 15H1Z" opacity="0.6" />
        </svg>
      )
    default:
      return <span className="inline-block h-4 w-4 rounded-sm bg-gray-500" aria-hidden />
  }
}

function MicrobeAttributeRow({ Mobility, Agility, Size }: Microbe) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-[12px] leading-none">
      <span className="inline-flex items-center gap-0.5">
        <svg className="h-3.5 w-3.5 shrink-0 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="1" width="4" height="4" />
          <rect x="6" y="1" width="4" height="4" />
          <rect x="11" y="1" width="4" height="4" />
          <rect x="1" y="6" width="4" height="4" />
          <rect x="6" y="6" width="4" height="4" />
          <rect x="11" y="6" width="4" height="4" />
          <rect x="1" y="11" width="4" height="4" />
          <rect x="6" y="11" width="4" height="4" />
          <rect x="11" y="11" width="4" height="4" />
        </svg>
        <span className="tabular-nums text-gray-700">{Mobility}</span>
      </span>
      <span className="inline-flex items-center gap-0.5">
        <svg className="h-3.5 w-3.5 shrink-0 text-yellow-500" viewBox="0 0 16 16" fill="currentColor">
          <path d="M9 1L4 9h4l-1 6 5-8H8l1-6z" />
        </svg>
        <span className="tabular-nums text-gray-700">{Agility}</span>
      </span>
      <span className="inline-flex items-center gap-0.5">
        <svg className="h-3.5 w-3.5 shrink-0 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1 15L1 1L15 15H1Z" opacity="0.6" />
        </svg>
        <span className="tabular-nums text-gray-700">{Size}</span>
      </span>
    </div>
  )
}

function SlotAttributeRow({ Mobility, Agility, Size }: Microbe) {
  return (
    <div className="flex w-full flex-col gap-1 px-2 text-[12px] leading-none">
      <div className="flex items-center justify-between">
        <span className="text-gray-600">Mobility</span>
        <span className="font-bold tabular-nums text-gray-800">{Mobility}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-600">Agility</span>
        <span className="font-bold tabular-nums text-gray-800">{Agility}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-600">Size</span>
        <span className="font-bold tabular-nums text-gray-800">{Size}</span>
      </div>
    </div>
  )
}

// Phase 1 range + ui (condensed from profiling page)
function clampSliderStart(value: number) {
  return Math.min(8, Math.max(1, Math.round(value)))
}

function selectionKey(type: "attribute" | "trait", name: string) {
  return `${type}:${name}`
}

function RangeTrack(props: {
  attrName: string
  min: number
  max: number
  highlight: boolean
  sliderStart: number
  onSliderChange: (name: string, val: number) => void
}) {
  const { attrName, highlight, sliderStart, onSliderChange } = props
  const leftPct = ((sliderStart - 1) / 9) * 100
  const widthPct = (2 / 9) * 100
  return (
    <div className="relative flex min-w-[120px] max-w-[220px] flex-1 items-center">
      <div className="pointer-events-none absolute -top-5 left-0 right-0 flex justify-between text-[9px] font-medium text-gray-400">
        <span>1</span>
        <span>10</span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-gray-200">
        <div
          className={`absolute top-0 h-full rounded-full transition-colors ${
            highlight ? "bg-[#4ECDC4]" : "bg-[#4ECDC4]/20"
          }`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        />
        {highlight ? (
          <div
            className="pointer-events-none absolute top-1/2 z-[5] flex -translate-y-1/2 items-center justify-center gap-0.5"
            style={{ left: `${leftPct + widthPct / 2 - 2}%` }}
          >
            <div className="h-2 w-0.5 rounded-full bg-white/80" />
            <div className="h-2 w-0.5 rounded-full bg-white/80" />
          </div>
        ) : null}
      </div>
      {highlight ? (
        <input
          type="range"
          min={1}
          max={8}
          step={1}
          value={sliderStart}
          onChange={(e) => {
            e.stopPropagation()
            onSliderChange(attrName, Number(e.target.value))
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`${attrName} range`}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
      ) : null}
    </div>
  )
}

function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <span
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors ${
        on ? "border-[#4ECDC4] bg-[#4ECDC4]" : "border-gray-300 bg-gray-200"
      }`}
      aria-hidden
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </span>
  )
}

function attributeRowIcon(name: string) {
  return attributeKeyIcon(name)
}

// ─── Phase wrappers ───────────────────────────────────────────────────────────

function GamePhase1Panel({
  scenario,
  traits,
  onComplete,
}: {
  scenario: ScenarioRequirements
  traits: string[]
  onComplete: (score: import("@/lib/game-scoring").Phase1Score, picks: GSelectionItem[]) => void
}) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set())
  const [sliderPositions, setSliderPositions] = useState<Record<string, number>>({
    Mobility: 1,
    Agility: 1,
    Size: 1,
  })

  useEffect(() => {
    setSliderPositions({
      Mobility: clampSliderStart(scenario.attributes.Mobility.min),
      Agility: clampSliderStart(scenario.attributes.Agility.min),
      Size: clampSliderStart(scenario.attributes.Size.min),
    })
  }, [scenario])

  const toggleItem = (item: GSelectionItem) => {
    const k = selectionKey(item.type, item.name)
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else {
        if (next.size >= 2) return prev
        next.add(k)
      }
      return next
    })
  }

  const handleSlider = useCallback((name: string, val: number) => {
    setSliderPositions((p) => ({ ...p, [name]: clampSliderStart(val) }))
  }, [])

  const itemsFromKeys = (keys: Set<string>): GSelectionItem[] => {
    const out: GSelectionItem[] = []
    for (const n of ATTR_NAMES) {
      const kk = selectionKey("attribute", n)
      if (keys.has(kk)) {
        const st = clampSliderStart(sliderPositions[n] ?? scenario.attributes[n].min)
        out.push({ type: "attribute", name: n, selectedMin: st, selectedMax: st + 2 })
      }
    }
    for (const t of traits) {
      if (keys.has(selectionKey("trait", t))) out.push({ type: "trait", name: t })
    }
    return out
  }

  const submit = () => {
    if (selectedKeys.size !== 2) return
    const picks = itemsFromKeys(selectedKeys)
    const score = scorePhase1({
      playerSelection: picks,
      scenario: { ...scenarioToSiteReq(scenario), name: scenario.name },
    })
    onComplete(score, picks)
  }

  const req = scenario
  return (
    <div className="relative z-10 mx-auto mt-[4.5rem] mb-24 w-[min(900px,calc(100%-18rem))] rounded-2xl border border-white/30 bg-white/95 p-5 shadow-xl backdrop-blur-sm">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Characteristics</h2>
      <p className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-600">Attributes</p>
      <div className="mb-8 space-y-3">
        {ATTR_NAMES.map((name) => {
          const r = req.attributes[name]
          const on = selectedKeys.has(selectionKey("attribute", name))
          const start = clampSliderStart(sliderPositions[name] ?? r.min)
          return (
            <div
              key={name}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-colors ${
                on ? "border-[#4ECDC4] bg-[#4ECDC4]/10" : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className={`inline-flex shrink-0 ${on ? "" : "opacity-40"}`}>{attributeRowIcon(name)}</span>
                <span className={`w-[72px] shrink-0 font-medium ${on ? "text-gray-800" : "text-gray-400"}`}>{name}</span>
                <RangeTrack
                  attrName={name}
                  min={r.min}
                  max={r.max}
                  highlight={on}
                  sliderStart={start}
                  onSliderChange={handleSlider}
                />
                <span
                  className={`w-14 shrink-0 text-center text-sm font-semibold tabular-nums ${
                    on ? "text-gray-700" : "text-gray-400"
                  }`}
                >
                  {start}-{start + 2}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleItem({ type: "attribute", name })}
                className="shrink-0 cursor-pointer appearance-none border-none bg-transparent p-0"
                aria-label={`Toggle ${name}`}
              >
                <ToggleSwitch on={on} />
              </button>
            </div>
          )
        })}
      </div>
      <p className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-600">Traits</p>
      <div className="mb-8 space-y-3">
        {traits.map((trait) => {
          const k = selectionKey("trait", trait)
          const on = selectedKeys.has(k)
          return (
            <div
              key={trait}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${
                on ? "border-[#4ECDC4] bg-[#4ECDC4]/10" : "border-gray-200 bg-white"
              }`}
            >
              <TraitBadgeChip trait={trait} chipClassName="h-8 w-8" />
              <span className="min-w-0 flex-1 break-words font-medium" style={{ color: traitColor(trait) }}>
                {trait}
              </span>
              <button
                type="button"
                onClick={() => toggleItem({ type: "trait", name: trait })}
                className="shrink-0 cursor-pointer appearance-none border-none bg-transparent p-0"
                aria-label={`Toggle ${trait}`}
              >
                <ToggleSwitch on={on} />
              </button>
            </div>
          )
        })}
      </div>
      <div className="flex justify-center border-t border-gray-200 pt-5">
        <button
          type="button"
          disabled={selectedKeys.size !== 2}
          onClick={submit}
          className={`min-w-[200px] rounded-lg px-10 py-3 text-sm font-semibold transition-colors ${
            selectedKeys.size === 2
              ? "cursor-pointer bg-[rgba(20,30,50,0.9)] text-white hover:bg-[rgba(30,40,60,0.95)]"
              : "cursor-not-allowed bg-gray-300 text-gray-500"
          }`}
        >
          Submit
        </button>
      </div>
    </div>
  )
}

type P2Pick = "site1" | "site2" | "return"

function GamePhase2Panel({
  pool,
  traits,
  isLastSite,
  labels,
  onComplete,
}: {
  pool: CategorizationPool
  currentScenario?: ScenarioRequirements
  nextScenarioName?: string | null
  traits: string[]
  labels: { current: string; next?: string | null }
  isLastSite: boolean
  onComplete: (result: import("@/lib/game-scoring").Phase2Score, tagged: Microbe[], rows: Phase2DecisionRow[]) => void
}) {
  void traits
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<P2Pick | null>(null)
  const [decisions, setDecisions] = useState<{ id: string; choice: P2Pick }[]>([])
  const [bucketState, setBucketState] = useState<{ b1: Microbe[]; b2: Microbe[]; ret: Microbe[] }>({
    b1: [],
    b2: [],
    ret: [],
  })

  const microbe = pool.microbes[idx] ?? null
  const ix = microbe ? blobIdx(pool.microbes, microbe.id) : 0
  const Svg = microbeComponents[ix % microbeComponents.length]!
  const col = MICROBE_PALETTE[ix % MICROBE_PALETTE.length]!

  function finalize(rowsDec: { id: string; choice: P2Pick }[]) {
    const rows: Phase2DecisionRow[] = rowsDec.map((d) => ({
      microbeId: d.id,
      playerChoice: d.choice,
      correctChoice: correctP2Choice(pool, d.id),
      reason: correctP2Reason(pool, d.id),
    }))
    const score = scorePhase2(rows)
    const b2: Microbe[] = []
    for (const d of rowsDec) {
      if (d.choice === "site2") {
        const m = pool.microbes.find((x) => x.id === d.id)!
        b2.push(m)
      }
    }
    onComplete(score, b2, rows)
  }

  const submitOne = () => {
    if (!microbe || picked === null) return
    const nextDec = [...decisions, { id: microbe.id, choice: picked }]
    const k = picked === "site1" ? "b1" : picked === "site2" ? "b2" : "ret"
    const nextBuckets = {
      ...bucketState,
      [k]: [...bucketState[k], microbe],
    }
    setDecisions(nextDec)
    setBucketState(nextBuckets)
    setPicked(null)

    if (idx < pool.microbes.length - 1) {
      setIdx((i) => i + 1)
      return
    }
    finalize(nextDec)
  }

  return (
    <div className="relative z-10 mx-auto mt-[4.75rem] mb-32 flex min-h-0 flex-col px-4">
      <div className="mb-4 rounded-xl bg-white/90 px-4 py-3 text-center text-sm shadow">
        Microbe <span className="font-bold">{idx + 1}</span> / 10 — categorize microbes
      </div>
      <div className="flex flex-wrap justify-center gap-4 lg:flex-nowrap">
        <div className="flex min-h-[520px] w-full max-w-md flex-col rounded-xl border border-white/30 bg-white/95 p-4 shadow-xl">
          <h3 className="mb-2 text-center font-bold text-gray-800">Current Microbe</h3>
          {microbe ? (
            <div className="flex flex-col items-center">
              <Svg color={col} />
              <p className="mt-2 text-center font-bold">{microbe.name}</p>
              <SlotAttributeRow {...microbe} />
              <div className="mt-3">
                <TraitBadgeChip trait={microbe.trait} chipClassName="h-10 w-10" />
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500">Done</p>
          )}
          <div className="mt-6 flex flex-col gap-2">
            <p className="text-center text-xs text-gray-500">Your choice</p>
            {!isLastSite ? (
              <div className="flex gap-2">
                <ChoiceBtn label={labels.current} active={picked === "site1"} onClick={() => setPicked("site1")} />
                <ChoiceBtn
                  label={labels.next ? `Next (${labels.next})` : "Next site"}
                  active={picked === "site2"}
                  onClick={() => setPicked("site2")}
                />
                <ChoiceBtn label="Return" active={picked === "return"} onClick={() => setPicked("return")} />
              </div>
            ) : (
              <div className="flex gap-2">
                <ChoiceBtn label={labels.current} active={picked === "site1"} onClick={() => setPicked("site1")} />
                <ChoiceBtn label="Return" active={picked === "return"} onClick={() => setPicked("return")} />
              </div>
            )}
            <button
              type="button"
              disabled={!microbe || picked === null}
              onClick={submitOne}
              className="mt-2 rounded-lg bg-[rgba(20,30,50,0.9)] px-4 py-2 text-white disabled:opacity-40"
            >
              Confirm choice
            </button>
          </div>
        </div>
        <div className="grid w-full max-w-xl flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          <BucketPreview title={labels.current} microbes={bucketState.b1} source={pool.microbes} />
          {!isLastSite ? (
            <BucketPreview title={`Next (${labels.next ?? "site"})`} microbes={bucketState.b2} source={pool.microbes} />
          ) : (
            <div />
          )}
          <BucketPreview title="Returned" microbes={bucketState.ret} source={pool.microbes} className={isLastSite ? "sm:col-span-2" : ""} />
        </div>
      </div>
    </div>
  )
}

function ChoiceBtn({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg border-2 px-2 py-2 text-xs font-semibold ${
        active ? "border-[#4ECDC4] bg-[#4ECDC4]/15" : "border-gray-200 bg-white"
      }`}
    >
      {label}
    </button>
  )
}

function BucketPreview({
  title,
  microbes,
  source,
  className = "",
}: {
  title: string
  microbes: Microbe[]
  source: Microbe[]
  className?: string
}) {
  return (
    <div className={`max-h-[400px] overflow-y-auto rounded-xl border bg-white/90 p-3 shadow ${className}`}>
      <h4 className="mb-2 text-center text-xs font-bold text-gray-700">{title}</h4>
      <div className="space-y-2">
        {microbes.map((m) => (
          <div key={m.id} className="flex items-center gap-2 rounded border p-2 text-[11px]">
            <div className="h-8 w-8 shrink-0 scale-50">{MicrobeSvgFor(m, source)}</div>
            <span className="font-medium truncate">{m.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GamePhase0Panel({
  taggedMicrobes,
  scenario,
  traits,
  onComplete,
}: {
  taggedMicrobes: Microbe[]
  scenario: ScenarioRequirements
  traits: string[]
  onComplete: (score: import("@/lib/game-scoring").Phase0Score) => void
}) {
  void traits
  const [i, setI] = useState(0)
  const [rows, setRows] = useState<Phase0DecisionInput[]>([])
  const [choice, setChoice] = useState<"keep" | "return" | null>(null)
  const m = taggedMicrobes[i]
  const req = scenarioToSiteReq(scenario)

  const confirm = () => {
    if (!m || choice === null) return
    const next = [...rows, { microbe: { ...m, name: m.name }, playerChoice: choice, siteRequirements: req }]
    setRows(next)
    setChoice(null)
    if (i >= taggedMicrobes.length - 1) {
      onComplete(scorePhase0(next))
      return
    }
    setI((x) => x + 1)
  }

  if (taggedMicrobes.length === 0) return null

  return (
    <div className="relative z-10 mx-auto mt-[4.75rem] max-w-xl rounded-2xl border border-white/30 bg-white/95 p-6 shadow-xl">
      <h2 className="mb-2 text-xl font-bold">Review tagged microbes</h2>
      <p className="mb-4 text-sm text-gray-600">
        Microbe {i + 1} / {taggedMicrobes.length}
      </p>
      {m ? (
        <div className="mb-4 flex flex-col items-center">
          {MicrobeSvgFor(m, taggedMicrobes)}
          <p className="font-bold">{m.name}</p>
          <MicrobeAttributeRow {...m} />
          <TraitBadgeChip trait={m.trait} />
        </div>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setChoice("keep")}
          className={`flex-1 rounded-lg border-2 py-3 font-semibold ${choice === "keep" ? "border-teal-500 bg-teal-50" : "border-gray-200"}`}
        >
          Keep
        </button>
        <button
          type="button"
          onClick={() => setChoice("return")}
          className={`flex-1 rounded-lg border-2 py-3 font-semibold ${choice === "return" ? "border-orange-400 bg-orange-50" : "border-gray-200"}`}
        >
          Return
        </button>
      </div>
      <button
        type="button"
        disabled={choice === null}
        className="mt-4 w-full rounded-lg bg-[rgba(20,30,50,0.9)] py-3 text-white disabled:opacity-40"
        onClick={confirm}
      >
        Confirm
      </button>
    </div>
  )
}

const GRID_SLOTS = 10
const TOTAL_P3_ROUNDS = 4

function prospectToPhase3Input(
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

function GamePhase3PoolPanel({
  prospect,
  scenario,
  traits,
  scenariosFileTraits,
  onComplete,
}: {
  prospect: ProspectScenarioJson
  scenario: ScenarioRequirements
  traits: string[]
  scenariosFileTraits: string[]
  onComplete: (score: import("@/lib/game-scoring").Phase3Score, pool: Microbe[]) => void
}) {
  void traits
  const [pool, setPool] = useState<Microbe[]>(() => [...prospect.preloaded_microbes])
  const [roundIdx, setRoundIdx] = useState(0)
  const [pickId, setPickId] = useState<string | null>(null)
  const [picks, setPicks] = useState<string[]>([])
  const set = prospect.choose_sets[roundIdx]

  const keyTraits = useMemo(() => {
    const inPool = new Set(pool.map((m) => m.trait))
    const ordered = scenariosFileTraits.filter((t) => inPool.has(t))
    const extras = [...inPool].filter((t) => !scenariosFileTraits.includes(t)).sort()
    return [...ordered, ...extras]
  }, [pool, scenariosFileTraits])

  const confirmRound = () => {
    if (!set || !pickId) return
    const chosen = set.candidates.find((c) => c.microbe.id === pickId)?.microbe
    if (!chosen) return
    const nextPickIds = [...picks, pickId]
    setPicks(nextPickIds)
    setPool((p) => [...p, chosen])
    setPickId(null)
    if (roundIdx >= TOTAL_P3_ROUNDS - 1) {
      const builtOrdered = [...prospect.preloaded_microbes]
      const reqPick = scenarioToSiteReq(scenario)
      for (let rIdx = 0; rIdx < nextPickIds.length; rIdx++) {
        const pid = nextPickIds[rIdx]
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

      const finalScore = scorePhase3({
        chooseSets: prospectToPhase3Input(prospect, nextPickIds),
        playerPickIds: nextPickIds,
        originalMaxScore: prospect.original_max_score,
        playerPoolMaxScore,
      })
      onComplete(finalScore, builtOrdered)
      return
    }
    setRoundIdx((r) => r + 1)
  }

  if (!set) return null

  const candidates = set.candidates

  return (
    <div className="relative z-10 mx-auto mt-[4.75rem] mb-36 w-[min(1200px,100%)] px-4">
      <div className="mb-4 rounded-lg bg-white/90 p-3 text-center text-sm shadow">
        Round {roundIdx + 1} of {TOTAL_P3_ROUNDS} — pick one candidate below
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {candidates.map((candidate, ix) => {
          const m = candidate.microbe
          const blobColor = MICROBE_PALETTE[ix % MICROBE_PALETTE.length]!
          const Svg = microbeComponents[ix % microbeComponents.length]!
          const sel = pickId === m.id
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setPickId((p) => (p === m.id ? null : m.id))}
              className={`flex h-[210px] w-[150px] flex-col rounded-xl border-2 bg-white p-2 shadow ${sel ? "border-[#4ECDC4]" : "border-gray-200"}`}
            >
              <div className="text-center text-xs font-bold line-clamp-1">{m.name}</div>
              <div className="flex shrink-0 justify-center scale-[0.85]">
                <Svg color={blobColor} />
              </div>
              <div className="mt-auto px-1 text-[10px]">
                <span
                  className={`inline-block rounded px-1 py-0.5 font-semibold capitalize ${
                    candidate.classification === "optimal"
                      ? "bg-emerald-100 text-emerald-800"
                      : candidate.classification === "negative"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {candidate.classification}
                </span>
              </div>
              <SlotAttributeRow {...m} />
            </button>
          )
        })}
      </div>
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          disabled={!pickId}
          className="rounded-lg bg-[rgba(20,30,50,0.9)] px-8 py-3 text-white disabled:opacity-40"
          onClick={confirmRound}
        >
          Confirm selection
        </button>
      </div>
      <div className="mx-auto mt-10 grid max-w-[880px] grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {Array.from({ length: GRID_SLOTS }, (_, ix) => {
          const mm = pool[ix]
          if (!mm)
            return <div key={`e-${ix}`} className="h-[140px] rounded-xl border border-dashed border-gray-300 bg-white/30" />
          const Svg = microbeComponents[ix % microbeComponents.length]!
          const c = MICROBE_PALETTE[ix % MICROBE_PALETTE.length]!
          return (
            <div key={`${mm.id}-${ix}`} className="rounded-xl border bg-white p-2 shadow">
              <div className="text-center text-[11px] font-bold line-clamp-1">{mm.name}</div>
              <div className="flex justify-center [&>svg]:h-14 [&>svg]:w-14">
                <Svg color={c} />
              </div>
              <div className="flex items-center justify-between gap-1">
                <MicrobeAttributeRow {...mm} />
                <TraitBadgeChip trait={mm.trait} chipClassName="h-7 w-7" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Key */}
      <div className="pointer-events-none fixed right-24 bottom-4 z-40 hidden xl:block xl:pointer-events-auto">
        <div className="rounded-lg bg-[rgba(20,30,50,0.85)] px-3 py-2 text-[10px] text-white opacity-70">
          Pool {pool.length}/{GRID_SLOTS}
        </div>
      </div>
      <select className="sr-only" value={scenario.name} disabled aria-hidden>
        {keyTraits.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
    </div>
  )
}

function GamePhase4TreatmentPanel({
  builtPool,
  scenario,
  scenariosFileTraits,
  onComplete,
}: {
  builtPool: Microbe[]
  scenario: ScenarioRequirements
  scenariosFileTraits: string[]
  onComplete: (s: Phase4Score) => void
}) {
  const [selected, setSelected] = useState<Microbe[]>([])
  const microbes = builtPool.slice(0, GRID_SLOTS)
  const keyTraits = useMemo(() => {
    const inPool = new Set(microbes.map((m) => m.trait))
    const ordered = scenariosFileTraits.filter((t) => inPool.has(t))
    const extras = [...inPool].filter((t) => !scenariosFileTraits.includes(t)).sort()
    return [...ordered, ...extras]
  }, [microbes, scenariosFileTraits])
  void keyTraits

  const togglePick = (m: Microbe) => {
    setSelected((prev) => {
      if (prev.some((x) => x.id === m.id)) return prev.filter((x) => x.id !== m.id)
      if (prev.length >= 3) return prev
      return [...prev, m]
    })
  }

  const submit = () => {
    if (selected.length !== 3) return
    const s = scorePhase4({
      selectedMicrobes: selected as Phase4MicrobeInput[],
      allMicrobes: microbes as Phase4MicrobeInput[],
      req: scenarioToSiteReq(scenario),
    })
    onComplete(s)
  }

  return (
    <div className="relative z-10 mx-auto mt-[4.75rem] mb-36 w-[min(1000px,calc(100%-2rem))]">
      <p className="mb-4 text-center text-sm text-white/90">
        Selected {selected.length} / 3 — tap microbes in the tray below (pool from Prospect phase)
      </p>
      <div className="mb-8 flex justify-center gap-3">
        {[0, 1, 2].map((slot) => {
          const m = selected[slot]
          return (
            <button
              key={slot}
              type="button"
              onClick={() => m && setSelected((prev) => prev.filter((x) => x.id !== m.id))}
              className="flex h-[120px] w-[100px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/50 bg-white/20 px-2"
            >
              {m ? (
                <>
                  <div className="scale-75">{MicrobeSvgFor(m, microbes)}</div>
                  <span className="line-clamp-2 text-[10px] font-bold">{m.name}</span>
                </>
              ) : (
                <span className="text-xs text-white">Empty</span>
              )}
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
        {microbes.map((m, ix) => {
          const inSel = selected.some((x) => x.id === m.id)
          return (
            <button
              key={m.id}
              type="button"
              disabled={selected.length >= 3 && !inSel}
              onClick={() => togglePick(m)}
              className={`rounded-xl border-2 bg-white p-3 text-left shadow transition ${
                inSel ? "border-blue-400 ring-2 ring-blue-300" : "border-gray-200 hover:border-teal-300"
              }`}
            >
              <div className="flex gap-2">
                <div className="flex justify-center">{MicrobeSvgFor(m, microbes)}</div>
                <div className="min-w-0">
                  <div className="text-sm font-bold line-clamp-1">{m.name}</div>
                  <MicrobeAttributeRow {...m} />
                  <TraitBadgeChip trait={m.trait} />
                </div>
              </div>
            </button>
          )
        })}
      </div>
      <div className="mt-10 flex justify-center">
        <button
          type="button"
          disabled={selected.length !== 3}
          onClick={submit}
          className="rounded-xl bg-[rgba(20,30,50,0.95)] px-12 py-3 font-semibold text-white disabled:bg-gray-500"
        >
          Submit Treatment
        </button>
      </div>
      <select className="sr-only" value={scenario.name} disabled aria-hidden>
        {[1, 2, 3].map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </div>
  )
}

function StickySitePanel({ scenario }: { scenario: ScenarioRequirements }) {
  return (
    <div className="absolute top-[5.75rem] right-4 z-[15] hidden w-[15rem] max-h-[calc(100vh-5rem)] overflow-y-auto rounded-lg bg-[#FFF9C4] p-4 shadow-lg xl:block">
      <h3 className="mb-2 text-sm font-bold text-gray-800 uppercase">Site info</h3>
      <p className="mb-2 text-xs font-medium text-gray-700">{scenario.name}</p>
      <div className="space-y-0.5 pl-1 text-sm text-gray-700">
        <p>
          Mobility: {scenario.attributes.Mobility.min}–{scenario.attributes.Mobility.max}
        </p>
        <p>
          Agility: {scenario.attributes.Agility.min}–{scenario.attributes.Agility.max}
        </p>
        <p>
          Size: {scenario.attributes.Size.min}–{scenario.attributes.Size.max}
        </p>
      </div>
      <div className="mt-2 space-y-1 text-sm">
        <p className="text-emerald-700">Desired: {scenario.desired_trait}</p>
        <p className="text-red-700">Undesired: {scenario.undesired_trait}</p>
      </div>
    </div>
  )
}

function SharedKeyPanel({
  expanded,
  toggle,
  attributes,
  traitList,
}: {
  expanded: boolean
  toggle: () => void
  attributes: string[]
  traitList: string[]
}) {
  return (
    <div className="fixed right-4 bottom-4 z-30 xl:right-8">
      <div
        className={`overflow-hidden rounded-xl bg-[rgba(20,30,50,0.92)] backdrop-blur-sm transition-all ${
          expanded ? "w-48" : "w-20"
        }`}
      >
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center justify-between px-4 py-2 font-medium text-white"
        >
          <span>Key</span>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
        {expanded ? (
          <div className="space-y-3 px-4 pb-4">
            <div>
              <p className="mb-1 text-xs text-gray-400">Attributes</p>
              <div className="space-y-1 text-sm text-white">
                {attributes.map((attr) => (
                  <div key={attr} className="flex items-center gap-2">
                    {attributeKeyIcon(attr)}
                    <span>{attr}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-400">Traits</p>
              <div className="space-y-1 text-sm text-white">
                {traitList.map((trait) => (
                  <div key={trait} className="flex items-center gap-2">
                    <div style={{ color: traitColor(trait) }}>{traitIcon(trait, "h-4 w-4")}</div>
                    <span>{trait}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SharedTopBar({
  timeRemaining,
  currentSiteHighlight,
  phaseLabel,
  progressPercent,
}: {
  timeRemaining: number
  currentSiteHighlight: 1 | 2 | 3
  phaseLabel: string
  progressPercent: number
}) {
  return (
    <div className="sticky top-0 z-40 flex shrink-0 flex-col bg-[rgba(20,30,50,0.95)] backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-1">
          {([1, 2, 3] as const).map((n, idx) => {
            const active = currentSiteHighlight === n
            const dotClass = active ? "bg-blue-500" : "border-2 border-gray-500 bg-transparent"
            const labelClass = active ? "text-white" : "text-gray-400"
            return (
              <div key={n} className="flex items-center">
                {idx > 0 ? <div className="mx-1 h-0.5 w-4 bg-gray-600 md:w-6" aria-hidden /> : null}
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 shrink-0 rounded-full ${dotClass}`} />
                  <span className={`text-xs md:text-sm ${labelClass}`}>Site {n}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="hidden flex-col items-center sm:flex">
          <span className="text-xs tabular-nums text-white md:text-sm">Time: {formatCountdown(timeRemaining)}</span>
          <div className="mt-0.5 h-1.5 w-40 overflow-hidden rounded-full bg-gray-700 md:h-2 md:w-64">
            <div className="h-full rounded-full bg-green-500 transition-all duration-700" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button type="button" className="text-white/70 hover:text-white" aria-label="Settings">
            <Settings className="h-5 w-5" />
          </button>
          <Link href="/" className="text-white/70 hover:text-white" aria-label="Exit">
            <LogOut className="h-5 w-5" />
          </Link>
        </div>
      </div>
      <div className="border-t border-gray-700/50 px-4 py-1 text-center text-[11px] text-gray-400 md:text-xs">{phaseLabel}</div>
      <div className="flex justify-center pb-2 sm:hidden">
        <span className="text-xs tabular-nums text-white">{formatCountdown(timeRemaining)}</span>
      </div>
    </div>
  )
}

function phaseLabelFromStep(step: GameStep): string {
  if (step.includes("_phase1")) return "Phase 1: Profile"
  if (step.includes("_phase2")) return "Phase 2: Categorize"
  if (step.includes("_phase0")) return "Phase 0: Review"
  if (step.includes("_phase3")) return "Phase 3: Prospect Pool"
  if (step.includes("_phase4")) return "Phase 4: Treatment"
  return ""
}

function siteHighlightFromStep(step: GameStep): 1 | 2 | 3 {
  if (step.startsWith("s2_")) return 2
  if (step.startsWith("s3_")) return 3
  return 1
}

function GameResultsFull({
  gameScore,
  totalSeconds,
  siteDetail,
}: {
  gameScore: import("@/lib/game-scoring").GameScore
  totalSeconds: number
  siteDetail: {
    site: SiteScore
    phase1Picks?: GSelectionItem[]
    scenarios: ScenarioRequirements
  }[]
}) {
  const globalPct = Math.round(gameScore.globalAverage)
  const tone = globalPct >= 75 ? "text-emerald-500" : globalPct >= 55 ? "text-amber-500" : "text-red-600"

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4ECDC4] to-[#2BA8A0] pb-24 text-gray-900">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(20,30,50,0.95)] px-4 py-4 text-white">
        <h1 className="text-xl font-bold md:text-2xl">Simulation Complete</h1>
        <p className={`mt-2 text-3xl font-bold tabular-nums ${tone}`}>{globalPct}% overall</p>
        <p className="mt-1 text-sm text-gray-300">Total session time: {formatMmSs(totalSeconds)}</p>
      </div>

      <div className="mx-auto mt-8 max-w-6xl space-y-6 px-4">
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/20 bg-white/95 p-6 shadow-lg">
            <h2 className="mb-3 font-bold uppercase tracking-wide text-gray-600">Per-phase averages</h2>
            <div className="flex flex-wrap gap-2">
              {(["phase1", "phase2", "phase0", "phase3", "phase4"] as const).map((k) => (
                <span key={k} className="rounded-full bg-[#4ECDC4]/25 px-3 py-2 text-xs font-semibold capitalize text-teal-900">
                  {k.replace("phase", "P")}
                  {": "}
                  {Math.round(gameScore.perPhaseAverages[k])}%
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/95 p-6 shadow-lg">
            <h2 className="mb-3 font-bold uppercase tracking-wide text-gray-600">Per-site</h2>
            <div className="space-y-2 text-sm">
              {gameScore.sites.map((s, ix) => (
                <div key={s.siteNumber} className="flex justify-between border-b border-gray-100 py-2 last:border-0">
                  <div>
                    <div className="font-semibold">Site {ix + 1}</div>
                    <div className="text-xs text-gray-600">{s.scenarioName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold tabular-nums">{Math.round(s.siteAverage)}%</div>
                    <div className="text-[11px] text-gray-500">{formatMmSs(s.timeSpent)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {siteDetail.map((entry, ix) => {
          const s = entry.site
          const opt1 = computeOptimalProfilingPicks(entry.scenarios)
          return (
            <details key={s.siteNumber} open={ix === 0} className="group rounded-2xl border border-white/20 bg-white p-6 shadow-xl open:shadow-2xl">
              <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-bold text-gray-900">
                Site {entry.site.siteNumber}: {entry.scenarios.name}
                <ChevronDown className="h-5 w-5 transition group-open:rotate-180" />
              </summary>
              <div className="mt-6 space-y-8">
                <section>
                  <h3 className="mb-2 font-bold text-teal-700">Phase 1 — Profile</h3>
                  <p className="text-sm">
                    Score: {s.phase1.raw}/2 → {Math.round(s.phase1.percentage)}%. Trait {s.phase1.traitCorrect ? "✓" : "✗"} —{" "}
                    {s.phase1.explanation.trait}. Attribute {s.phase1.attributeCorrect ? "✓" : "✗"} — {s.phase1.explanation.attribute}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-gray-100 px-2 py-1">Your picks: {JSON.stringify(entry.phase1Picks ?? [])}</span>
                    <span className="rounded bg-gray-100 px-2 py-1">Reference: {JSON.stringify(opt1)}</span>
                  </div>
                </section>
                <section>
                  <h3 className="mb-2 font-bold text-teal-700">Phase 2 — Categorize ({s.phase2.raw}/10)</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {s.phase2.decisions.map((d) => {
                      const mis = d.playerChoice !== d.correctChoice
                      const ex = s.phase2.explanation.incorrect.find((i) => i.id === d.microbeId)
                      return (
                        <div key={d.microbeId} className={`rounded-lg border p-2 text-[11px] ${mis ? "border-red-300 bg-red-50" : ""}`}>
                          <div className="font-semibold truncate">{d.microbeId}</div>
                          <div>Yours: {d.playerChoice}</div>
                          {!mis ? <div className="text-green-700">Correct</div> : <div>Expected: {d.correctChoice}</div>}
                          {ex ? <div className="mt-1 text-red-700">{ex.reason}</div> : null}
                        </div>
                      )
                    })}
                  </div>
                </section>
                {s.phase0 ? (
                  <section>
                    <h3 className="mb-2 font-bold text-teal-700">Phase 0 — Review ({s.phase0.raw}/{s.phase0.n})</h3>
                    <ul className="space-y-2 text-xs">
                      {s.phase0.decisions.map((d) => (
                        <li key={d.microbeId} className="rounded border px-2 py-1">
                          {d.microbeName}: {d.classification} · you {d.playerChoice} · {d.correct ? "correct" : "wrong"} · {d.reason}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                <section>
                  <h3 className="mb-2 font-bold text-teal-700">Phase 3 — Prospect (~{Math.round(s.phase3.percentage)}%)</h3>
                  <p className="text-xs text-gray-600">
                    Deductions: {Math.round((s.phase3.poolQualityPenalty + s.phase3.roundResults.reduce((a, r) => a + r.deduction, 0)) * 10) / 10}; pool penalty{" "}
                    {Math.round(s.phase3.poolQualityPenalty * 100) / 100}
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {s.phase3.roundResults.map((rr) => (
                      <div key={`r-${rr.round}`} className="rounded-lg border bg-gray-50 p-3 text-xs">
                        <div className="font-bold">Round {rr.round}</div>
                        <div>You picked id {rr.playerPickId ?? "—"}</div>
                        <div>Deduction: {rr.deduction}</div>
                        <div className={rr.optimalId && rr.optimalId !== rr.playerPickId ? "text-amber-700" : ""}>
                          Optimal would be {rr.optimalId ?? "none"}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="mb-2 font-bold text-teal-700">Phase 4 — Treatment ({s.phase4.score}/100)</h3>
                  <ul className="mb-4 space-y-1 text-xs">
                    <li>Mobility in range: {s.phase4.conditionResults.mobilityInRange ? "✓" : "✗"}</li>
                    <li>Agility in range: {s.phase4.conditionResults.agilityInRange ? "✓" : "✗"}</li>
                    <li>Size in range: {s.phase4.conditionResults.sizeInRange ? "✓" : "✗"}</li>
                    <li>Desired trait present: {s.phase4.conditionResults.desiredTraitPresent ? "✓" : "✗"}</li>
                    <li>Undesired absent: {s.phase4.conditionResults.undesiredTraitAbsent ? "✓" : "✗"}</li>
                  </ul>
                  {s.phase4.optimalScore < 100 ? (
                    <p className="mb-3 text-[11px] text-amber-800">Perfect 100 may be unreachable from this pool (best in pool ≈ {s.phase4.optimalScore}).</p>
                  ) : null}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase">Your trio</div>
                      {s.phase4.selectedMicrobes.map((m, jx) => {
                        const mm = m as Microbe
                        return (
                          <div
                            key={`player-trio-${jx}-${mm.trait}-${mm.Mobility}-${mm.Agility}-${mm.Size}`}
                            className="mb-2 rounded border p-2 text-xs"
                          >
                            {MicrobeSvgFor(mm, s.phase4.selectedMicrobes as Microbe[])} {mm.name} · {mm.trait}
                            <MicrobeAttributeRow {...mm} />
                          </div>
                        )
                      })}
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase">Best trio from pool</div>
                      {s.phase4.optimalCombination.map((m, i) => {
                        const mm = m as Microbe
                        return (
                          <div
                            key={`opt-${i}-${mm.trait}-${mm.Mobility}-${mm.Agility}-${mm.Size}`}
                            className="mb-2 rounded border border-teal-200 p-2 text-xs"
                          >
                            {MicrobeSvgFor(mm, s.phase4.optimalCombination as Microbe[])} {mm.name} · {mm.trait}
                            <MicrobeAttributeRow {...mm} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </section>
              </div>
            </details>
          )
        })}

        <div className="flex justify-center pt-8">
          <button
            type="button"
            onClick={() => typeof window !== "undefined" && window.location.reload()}
            className="rounded-xl bg-[rgba(20,30,50,0.95)] px-10 py-4 font-semibold text-white shadow-lg"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  )
}

function newSiteWip(siteNumber: 1 | 2 | 3, cfg: GameConfig): PartialSiteAccumulator {
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
  }
}

function sealPartialToSiteScore(w: PartialSiteAccumulator, secondsSpent: number): SiteScore {
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

export default function FullGamePage() {
  const [step, setStep] = useState<GameStep>("start")
  const [timeRemaining, setTimeRemaining] = useState(TIMER_START)
  const [scenariosMeta, setScenariosMeta] = useState<ScenariosFile | null>(null)
  const [gameCfg, setGameCfg] = useState<GameConfig | null>(null)
  const [pickingChains, setPickingChains] = useState(false)

  const [wip, setWip] = useState<PartialSiteAccumulator | null>(null)
  const wipRef = useRef<PartialSiteAccumulator | null>(null)
  wipRef.current = wip

  const [finishedSites, setFinishedSites] = useState<SiteScore[]>([])
  const [p1SelectionsBySite, setP1SelectionsBySite] = useState<GSelectionItem[][]>([])
  const [taggedForSite2, setTaggedForSite2] = useState<Microbe[]>([])
  const [taggedForSite3, setTaggedForSite3] = useState<Microbe[]>([])

  const remainRef = useRef(timeRemaining)
  useEffect(() => {
    remainRef.current = timeRemaining
  }, [timeRemaining])

  const siteRemainAtEnterRef = useRef<(number | null)[]>([null, null, null])
  const [keyExpanded, setKeyExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch("/scenarios.json")
        const j = (await r.json()) as ScenariosFile
        if (!cancelled) setScenariosMeta(j)
      } catch {
        /* ignore prefetch failure; start-game will retry */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (step === "start" || step === "results") return
    const id = window.setInterval(() => {
      setTimeRemaining((t) => (t <= 0 ? 0 : t - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [step])

  const traitsList = scenariosMeta?.traits ?? []
  const attrListForKey = scenariosMeta?.attributes ?? ATTR_NAMES.slice()

  const handleStartGame = useCallback(async () => {
    setPickingChains(true)
    try {
      const scRes =
        scenariosMeta ??
        (((await fetch("/scenarios.json").then((r) => r.json())) as ScenariosFile) ?? null)
      if (!scRes?.scenarios?.length) {
        window.alert("Could not load scenarios.")
        setPickingChains(false)
        return
      }
      if (!scenariosMeta) setScenariosMeta(scRes)

      const [cats, prospects] = await Promise.all([
        fetch("/categorization_pools.json").then((r) => r.json()) as Promise<CatPoolsFile>,
        fetch("/phase2_pools.json").then((r) => r.json()) as Promise<ProspectPoolsFile>,
      ])

      const chain = pickScenarioChain(scRes.scenarios, cats, prospects)
      if (!chain) {
        window.alert("Could not build a scenario chain — try Start again.")
        setPickingChains(false)
        return
      }

      setTimeRemaining(TIMER_START)
      remainRef.current = TIMER_START
      siteRemainAtEnterRef.current = [TIMER_START, null, null]

      setTaggedForSite2([])
      setTaggedForSite3([])
      setFinishedSites([])
      setP1SelectionsBySite([])
      setGameCfg(chain)
      setWip(newSiteWip(1, chain))
      setStep("s1_phase1")
    } catch (e) {
      console.error(e)
      window.alert("Failed to load game data.")
    } finally {
      setPickingChains(false)
    }
  }, [scenariosMeta])

  const cfg = gameCfg
  const w = wip
  const gameCfgRef = useRef<GameConfig | null>(null)
  gameCfgRef.current = cfg

  const resolvePhase4Complete = useCallback(
    (p4: Phase4Score) => {
      const wc = wipRef.current
      const g = gameCfgRef.current
      if (!wc || !g) return

      const merged: PartialSiteAccumulator = { ...wc, phase4Result: p4 }
      const siteIdx = wc.siteNumber - 1
      const startRem = siteRemainAtEnterRef.current[siteIdx] ?? remainRef.current
      const elapsed = Math.max(0, startRem - remainRef.current)

      const sealed = sealPartialToSiteScore(merged, elapsed)

      if (wc.siteNumber === 1) {
        siteRemainAtEnterRef.current[1] = remainRef.current
        setFinishedSites((prev) => [...prev, sealed])
        setP1SelectionsBySite((prev) => [...prev, wc.phase1Selections])
        setWip(newSiteWip(2, g))
        setStep(taggedForSite2.length > 0 ? "s2_phase0" : "s2_phase1")
        return
      }

      if (wc.siteNumber === 2) {
        siteRemainAtEnterRef.current[2] = remainRef.current
        setFinishedSites((prev) => [...prev, sealed])
        setP1SelectionsBySite((prev) => [...prev, wc.phase1Selections])
        setWip(newSiteWip(3, g))
        setStep(taggedForSite3.length > 0 ? "s3_phase0" : "s3_phase1")
        return
      }

      setFinishedSites((prev) => [...prev, sealed])
      setP1SelectionsBySite((prev) => [...prev, wc.phase1Selections])
      setStep("results")
    },
    [taggedForSite2.length, taggedForSite3.length],
  )

  const progressPct = Math.min(100, Math.max(0, (timeRemaining / TIMER_START) * 100))

  if (step === "results" && finishedSites.length === 3 && cfg) {
    const totalElapsed = TIMER_START - timeRemaining
    const gameScore: GameScore = computeGameScore(finishedSites, totalElapsed)
    return (
      <GameResultsFull
        gameScore={gameScore}
        totalSeconds={totalElapsed}
        siteDetail={finishedSites.map((siteRow, ix) => ({
          site: siteRow,
          phase1Picks: p1SelectionsBySite[ix],
          scenarios: cfg.scenarios[siteRow.siteNumber - 1]!,
        }))}
      />
    )
  }

  const phaseLbl = phaseLabelFromStep(step)
  const highlightSite = step === "start" ? 1 : siteHighlightFromStep(step)

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#4ECDC4] via-[#3EBDB5] to-[#2BA8A0]">
      {step !== "start" ? (
        <>
          <SharedTopBar
            timeRemaining={timeRemaining}
            currentSiteHighlight={highlightSite}
            phaseLabel={phaseLbl}
            progressPercent={progressPct}
          />
          {cfg && w ? (
            <>
              <StickySitePanel scenario={cfg.scenarios[highlightSite - 1]!} />
              {traitsList.length > 0 ? (
                <SharedKeyPanel expanded={keyExpanded} toggle={() => setKeyExpanded((k) => !k)} traitList={traitsList} attributes={attrListForKey as string[]} />
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {step === "start" ? (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center text-white">
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Seawolf Simulator</h1>
          <p className="mb-10 max-w-md text-lg text-white/95">
            Practice all 4 phases across 3 sites in a full 30-minute session
          </p>
          <button
            type="button"
            disabled={pickingChains}
            onClick={() => void handleStartGame()}
            className={`rounded-xl px-14 py-4 text-lg font-semibold shadow-lg transition ${
              pickingChains ? "cursor-wait bg-gray-600 text-gray-300" : "cursor-pointer bg-[rgba(20,30,50,0.95)] text-white hover:bg-[rgba(30,45,65,1)]"
            }`}
          >
            {pickingChains ? "Loading…" : "Start Game"}
          </button>
        </div>
      ) : null}

      {cfg && w ? (
        <>
          {step === "s1_phase1" ? (
            <GamePhase1Panel
              key="s1-p1"
              traits={traitsList}
              scenario={cfg.scenarios[0]!}
              onComplete={(score, picks) => {
                setWip((cur) => (cur ? { ...cur, phase1Result: score, phase1Selections: picks } : cur))
                setStep("s1_phase2")
              }}
            />
          ) : null}

          {step === "s1_phase2" ? (
            <GamePhase2Panel
              key={`s12-${cfg.catPool12.categorization_id}`}
              pool={cfg.catPool12}
              traits={traitsList}
              labels={{ current: cfg.catPool12.site1_scenario, next: cfg.catPool12.site2_scenario }}
              isLastSite={false}
              onComplete={(score, tagged, _rows) => {
                void _rows
                setTaggedForSite2(tagged)
                setWip((cur) => (cur ? { ...cur, phase2Result: score } : cur))
                setStep("s1_phase3")
              }}
            />
          ) : null}

          {step === "s1_phase3" ? (
            <GamePhase3PoolPanel
              key={`s1-p3-${cfg.prospectA.phase2_id}`}
              prospect={cfg.prospectA}
              traits={traitsList}
              scenario={cfg.scenarios[0]!}
              scenariosFileTraits={traitsList}
              onComplete={(score, pool) => {
                setWip((cur) => (cur ? { ...cur, phase3Result: score, phase3Pool: pool } : cur))
                setStep("s1_phase4")
              }}
            />
          ) : null}

          {step === "s1_phase4" && w.phase3Pool.length ? (
            <GamePhase4TreatmentPanel
              key="s1-p4"
              builtPool={w.phase3Pool}
              scenario={cfg.scenarios[0]!}
              scenariosFileTraits={traitsList}
              onComplete={resolvePhase4Complete}
            />
          ) : null}

          {step === "s2_phase0" && taggedForSite2.length > 0 ? (
            <GamePhase0Panel
              key="s2-p0"
              taggedMicrobes={taggedForSite2}
              scenario={cfg.scenarios[1]!}
              traits={traitsList}
              onComplete={(p0) => {
                setWip((cur) => (cur ? { ...cur, phase0Result: p0 } : cur))
                setStep("s2_phase1")
              }}
            />
          ) : null}

          {step === "s2_phase1" ? (
            <GamePhase1Panel
              key="s2-p1"
              traits={traitsList}
              scenario={cfg.scenarios[1]!}
              onComplete={(score, picks) => {
                setWip((cur) => (cur ? { ...cur, phase1Result: score, phase1Selections: picks } : cur))
                setStep("s2_phase2")
              }}
            />
          ) : null}

          {step === "s2_phase2" ? (
            <GamePhase2Panel
              key={`s23-${cfg.catPool23.categorization_id}`}
              pool={cfg.catPool23}
              traits={traitsList}
              labels={{ current: cfg.catPool23.site1_scenario, next: cfg.catPool23.site2_scenario }}
              isLastSite={false}
              onComplete={(score, tagged, _rows) => {
                void _rows
                setTaggedForSite3(tagged)
                setWip((cur) => (cur ? { ...cur, phase2Result: score } : cur))
                setStep("s2_phase3")
              }}
            />
          ) : null}

          {step === "s2_phase3" ? (
            <GamePhase3PoolPanel
              key={`s2-p3-${cfg.prospectB.phase2_id}`}
              prospect={cfg.prospectB}
              traits={traitsList}
              scenario={cfg.scenarios[1]!}
              scenariosFileTraits={traitsList}
              onComplete={(score, pool) => {
                setWip((cur) => (cur ? { ...cur, phase3Result: score, phase3Pool: pool } : cur))
                setStep("s2_phase4")
              }}
            />
          ) : null}

          {step === "s2_phase4" && w.phase3Pool.length ? (
            <GamePhase4TreatmentPanel
              key="s2-p4"
              builtPool={w.phase3Pool}
              scenario={cfg.scenarios[1]!}
              scenariosFileTraits={traitsList}
              onComplete={resolvePhase4Complete}
            />
          ) : null}

          {step === "s3_phase0" && taggedForSite3.length > 0 ? (
            <GamePhase0Panel
              key="s3-p0"
              taggedMicrobes={taggedForSite3}
              scenario={cfg.scenarios[2]!}
              traits={traitsList}
              onComplete={(p0) => {
                setWip((cur) => (cur ? { ...cur, phase0Result: p0 } : cur))
                setStep("s3_phase1")
              }}
            />
          ) : null}

          {step === "s3_phase1" ? (
            <GamePhase1Panel
              key="s3-p1"
              traits={traitsList}
              scenario={cfg.scenarios[2]!}
              onComplete={(score, picks) => {
                setWip((cur) => (cur ? { ...cur, phase1Result: score, phase1Selections: picks } : cur))
                setStep("s3_phase2")
              }}
            />
          ) : null}

          {step === "s3_phase2" ? (
            <GamePhase2Panel
              key={`s3-${cfg.catPoolSite3.categorization_id}`}
              pool={cfg.catPoolSite3}
              traits={traitsList}
              labels={{ current: cfg.catPoolSite3.site1_scenario, next: cfg.catPoolSite3.site2_scenario ?? null }}
              isLastSite
              onComplete={(score, _tagged, _rows) => {
                void _tagged
                void _rows
                setWip((cur) => (cur ? { ...cur, phase2Result: score } : cur))
                setStep("s3_phase3")
              }}
            />
          ) : null}

          {step === "s3_phase3" ? (
            <GamePhase3PoolPanel
              key={`s3-p3-${cfg.prospectC.phase2_id}`}
              prospect={cfg.prospectC}
              traits={traitsList}
              scenario={cfg.scenarios[2]!}
              scenariosFileTraits={traitsList}
              onComplete={(score, pool) => {
                setWip((cur) => (cur ? { ...cur, phase3Result: score, phase3Pool: pool } : cur))
                setStep("s3_phase4")
              }}
            />
          ) : null}

          {step === "s3_phase4" && w.phase3Pool.length ? (
            <GamePhase4TreatmentPanel
              key="s3-p4"
              builtPool={w.phase3Pool}
              scenario={cfg.scenarios[2]!}
              scenariosFileTraits={traitsList}
              onComplete={resolvePhase4Complete}
            />
          ) : null}
        </>
      ) : step !== "start" ? (
        <div className="flex min-h-screen items-center justify-center text-white">
          <p>Something went wrong — go back and start again.</p>
        </div>
      ) : null}
    </div>
  )
}
