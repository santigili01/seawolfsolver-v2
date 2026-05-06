"use client"

/**
 * Full-session Seawolf simulator: /game
 * Standalone simulator routes are untouched; phases are inlined wrappers here.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, Droplets, Flame, HelpCircle, Layers, LogOut, Settings, Shield, Star } from "lucide-react"
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
  type Phase1Score,
  type Phase3Score,
  type GameScore,
  type Phase3Candidate,
  type SiteScore,
} from "@/lib/game-scoring"

/** Dev-only: skip buttons & fast-forward to results. Set `false` for production builds. */
const DEV_MODE = true

const DEV_SKIP_BTN_CLASS =
  "fixed bottom-20 left-4 z-50 rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white shadow-lg hover:bg-orange-600"

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

/** Categorization “Site N+1 insight” reveal (verbatim shape from simulator JSON). */
type RevealedCharacteristic = {
  type: "trait" | "attribute"
  name: string
  value: string | { min: number; max: number }
}

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
  phase3SvgMap: Map<string, number> | null
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

function devPhase2PerfectComplete(pool: CategorizationPool): {
  score: ReturnType<typeof scorePhase2>
  tagged: Microbe[]
  rows: Phase2DecisionRow[]
} {
  const rows: Phase2DecisionRow[] = pool.microbes.map((m) => {
    const c = correctP2Choice(pool, m.id)
    return { microbeId: m.id, playerChoice: c, correctChoice: c, reason: correctP2Reason(pool, m.id) }
  })
  const tagged = pool.microbes.filter((m) => correctP2Choice(pool, m.id) === "site2")
  return { score: scorePhase2(rows), tagged, rows }
}

function devPhase0AllKeep(taggedMicrobes: Microbe[], scenario: ScenarioRequirements): ReturnType<typeof scorePhase0> {
  const req = scenarioToSiteReq(scenario)
  const inputs: Phase0DecisionInput[] = taggedMicrobes.map((m) => ({
    microbe: { ...m },
    playerChoice: "keep",
    siteRequirements: req,
  }))
  return scorePhase0(inputs)
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

function SlotTraitBadge({ trait }: { trait: string }) {
  const tc = traitColor(trait)
  return (
    <Tooltip text={trait}>
      <span
        className="inline-flex size-[32px] shrink-0 cursor-default items-center justify-center rounded-full text-[11px]"
        style={{
          backgroundColor: traitChipBg(trait),
          color: tc,
        }}
      >
        {traitIcon(trait, "h-[11px] w-[11px]")}
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
  "#F5A97F",
  "#8BD3E6",
  "#B8F2A1",
  "#C6A0F6",
  "#F8C8DC",
  "#7DD3FC",
  "#86EFAC",
  "#FDBA74",
  "#FCA5A5",
  "#A7F3D0",
  "#93C5FD",
  "#DDD6FE",
  "#FDE68A",
  "#FBCFE8",
  "#67E8F9",
  "#BBF7D0",
  "#F9A8D4",
  "#C4B5FD",
  "#BAE6FD",
  "#D9F99D",
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
    <path
      d="M40 10 Q70 20 65 50 Q60 75 40 70 Q20 75 15 50 Q10 20 40 10"
      fill={color}
    />
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

const MicrobeBlob11 = ({ color = "#F5A97F" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <rect x="18" y="18" width="44" height="44" rx="14" fill={color} />
    <circle cx="32" cy="34" r="4" fill="white" opacity="0.45" />
    <path d="M18 40 L10 40" stroke={color} strokeWidth="3" />
    <path d="M62 40 L70 40" stroke={color} strokeWidth="3" />
  </svg>
)
const MicrobeBlob12 = ({ color = "#8BD3E6" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 12 C58 12 66 24 66 40 C66 58 54 68 40 68 C24 68 14 56 14 40 C14 24 22 12 40 12Z" fill={color} />
    <ellipse cx="38" cy="32" rx="8" ry="5" fill="white" opacity="0.35" />
    <circle cx="24" cy="48" r="4" fill={color} />
    <circle cx="56" cy="48" r="4" fill={color} />
  </svg>
)
const MicrobeBlob13 = ({ color = "#B8F2A1" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="40" rx="24" ry="22" fill={color} />
    <circle cx="29" cy="30" r="6" fill={color} />
    <circle cx="53" cy="30" r="5" fill={color} />
    <circle cx="40" cy="50" r="7" fill="white" opacity="0.22" />
  </svg>
)
const MicrobeBlob14 = ({ color = "#C6A0F6" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 14 L58 24 L62 42 L50 58 L30 62 L18 46 L22 26 Z" fill={color} />
    <circle cx="37" cy="34" r="3" fill="white" opacity="0.55" />
    <path d="M22 26 L14 20" stroke={color} strokeWidth="2.5" />
    <path d="M58 24 L66 18" stroke={color} strokeWidth="2.5" />
  </svg>
)
const MicrobeBlob15 = ({ color = "#F8C8DC" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="42" rx="26" ry="18" fill={color} />
    <circle cx="28" cy="42" r="3" fill="white" opacity="0.45" />
    <circle cx="52" cy="42" r="3" fill="white" opacity="0.45" />
    <path d="M14 42 Q8 38 10 32" stroke={color} strokeWidth="3" fill="none" />
    <path d="M66 42 Q72 38 70 32" stroke={color} strokeWidth="3" fill="none" />
  </svg>
)
const MicrobeBlob16 = ({ color = "#7DD3FC" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <rect x="20" y="20" width="40" height="40" rx="20" fill={color} />
    <path d="M24 24 Q40 10 56 24" stroke={color} strokeWidth="3" fill="none" />
    <circle cx="35" cy="36" r="3" fill="white" opacity="0.5" />
    <circle cx="46" cy="44" r="5" fill="white" opacity="0.2" />
  </svg>
)
const MicrobeBlob17 = ({ color = "#86EFAC" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 14 C55 16 64 28 62 44 C60 60 48 68 34 64 C20 60 14 44 20 30 C24 20 30 14 40 14Z" fill={color} />
    <circle cx="34" cy="32" r="4" fill="white" opacity="0.5" />
    <path d="M26 62 L22 72" stroke={color} strokeWidth="2" />
    <path d="M38 66 L38 76" stroke={color} strokeWidth="2" />
    <path d="M50 64 L54 74" stroke={color} strokeWidth="2" />
  </svg>
)
const MicrobeBlob18 = ({ color = "#FDBA74" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 16 L54 24 L60 40 L54 56 L40 64 L26 56 L20 40 L26 24 Z" fill={color} />
    <circle cx="40" cy="40" r="9" fill="white" opacity="0.2" />
    <path d="M40 16 L40 8" stroke={color} strokeWidth="2" />
  </svg>
)
const MicrobeBlob19 = ({ color = "#FCA5A5" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="40" rx="23" ry="21" fill={color} />
    <circle cx="28" cy="34" r="3" fill="white" opacity="0.5" />
    <path d="M22 26 L14 20" stroke={color} strokeWidth="2.5" />
    <path d="M58 26 L66 20" stroke={color} strokeWidth="2.5" />
    <path d="M24 54 L15 60" stroke={color} strokeWidth="2.5" />
    <path d="M56 54 L65 60" stroke={color} strokeWidth="2.5" />
  </svg>
)
const MicrobeBlob20 = ({ color = "#A7F3D0" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M18 40 C18 24 30 14 42 16 C54 18 62 28 62 40 C62 54 54 64 40 64 C26 64 18 54 18 40Z" fill={color} />
    <ellipse cx="39" cy="31" rx="7" ry="4.5" fill="white" opacity="0.35" />
    <circle cx="22" cy="40" r="3.5" fill={color} />
    <circle cx="58" cy="40" r="3.5" fill={color} />
  </svg>
)
const MicrobeBlob21 = ({ color = "#93C5FD" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <rect x="16" y="18" width="48" height="44" rx="18" fill={color} />
    <circle cx="30" cy="32" r="4" fill="white" opacity="0.45" />
    <path d="M24 18 L20 8" stroke={color} strokeWidth="2.5" />
    <path d="M56 18 L60 8" stroke={color} strokeWidth="2.5" />
  </svg>
)
const MicrobeBlob22 = ({ color = "#DDD6FE" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="42" rx="25" ry="16" fill={color} />
    <ellipse cx="40" cy="42" rx="10" ry="6" fill="white" opacity="0.25" />
    <path d="M16 42 Q8 42 10 50" stroke={color} strokeWidth="3" fill="none" />
    <path d="M64 42 Q72 42 70 50" stroke={color} strokeWidth="3" fill="none" />
  </svg>
)
const MicrobeBlob23 = ({ color = "#FDE68A" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 14 C50 14 60 22 62 34 C64 50 54 64 40 66 C26 64 16 50 18 34 C20 22 30 14 40 14Z" fill={color} />
    <circle cx="34" cy="32" r="3" fill="white" opacity="0.5" />
    <circle cx="46" cy="48" r="6" fill="white" opacity="0.2" />
  </svg>
)
const MicrobeBlob24 = ({ color = "#FBCFE8" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 12 L52 18 L60 30 L58 46 L48 58 L32 62 L20 52 L16 36 L24 22 Z" fill={color} />
    <circle cx="36" cy="34" r="4" fill="white" opacity="0.45" />
    <path d="M40 12 L40 4" stroke={color} strokeWidth="2.5" />
    <path d="M24 22 L16 16" stroke={color} strokeWidth="2.5" />
  </svg>
)
const MicrobeBlob25 = ({ color = "#67E8F9" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="40" rx="22" ry="24" fill={color} />
    <ellipse cx="36" cy="30" rx="6" ry="4" fill="white" opacity="0.35" />
    <path d="M26 62 L22 72" stroke={color} strokeWidth="2.2" />
    <path d="M40 64 L40 74" stroke={color} strokeWidth="2.2" />
    <path d="M54 62 L58 72" stroke={color} strokeWidth="2.2" />
  </svg>
)
const MicrobeBlob26 = ({ color = "#BBF7D0" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <rect x="18" y="20" width="44" height="40" rx="12" fill={color} />
    <circle cx="30" cy="34" r="3" fill="white" opacity="0.5" />
    <circle cx="50" cy="46" r="5" fill="white" opacity="0.2" />
    <path d="M18 40 L10 36" stroke={color} strokeWidth="2.5" />
    <path d="M62 40 L70 36" stroke={color} strokeWidth="2.5" />
  </svg>
)
const MicrobeBlob27 = ({ color = "#F9A8D4" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="40" rx="24" ry="19" fill={color} />
    <path d="M20 32 Q14 20 24 14" stroke={color} strokeWidth="3" fill="none" />
    <path d="M60 32 Q66 20 56 14" stroke={color} strokeWidth="3" fill="none" />
    <circle cx="33" cy="36" r="3.5" fill="white" opacity="0.45" />
  </svg>
)
const MicrobeBlob28 = ({ color = "#C4B5FD" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 18 C56 18 64 30 62 44 C60 58 50 66 40 66 C28 66 18 56 18 44 C18 30 24 18 40 18Z" fill={color} />
    <circle cx="30" cy="38" r="4" fill="white" opacity="0.45" />
    <path d="M18 44 Q10 44 12 52" stroke={color} strokeWidth="2.5" fill="none" />
    <path d="M62 44 Q70 44 68 52" stroke={color} strokeWidth="2.5" fill="none" />
  </svg>
)
const MicrobeBlob29 = ({ color = "#BAE6FD" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="40" rx="20" ry="22" fill={color} />
    <circle cx="32" cy="32" r="3.2" fill="white" opacity="0.5" />
    <path d="M34 20 L30 10" stroke={color} strokeWidth="2.5" />
    <path d="M46 20 L50 10" stroke={color} strokeWidth="2.5" />
    <path d="M40 62 L40 74" stroke={color} strokeWidth="2.5" />
  </svg>
)
const MicrobeBlob30 = ({ color = "#D9F99D" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 14 L56 22 L64 38 L58 56 L42 64 L24 58 L16 40 L24 24 Z" fill={color} />
    <circle cx="36" cy="34" r="3.5" fill="white" opacity="0.45" />
    <circle cx="46" cy="46" r="6" fill="white" opacity="0.2" />
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
  MicrobeBlob11,
  MicrobeBlob12,
  MicrobeBlob13,
  MicrobeBlob14,
  MicrobeBlob15,
  MicrobeBlob16,
  MicrobeBlob17,
  MicrobeBlob18,
  MicrobeBlob19,
  MicrobeBlob20,
  MicrobeBlob21,
  MicrobeBlob22,
  MicrobeBlob23,
  MicrobeBlob24,
  MicrobeBlob25,
  MicrobeBlob26,
  MicrobeBlob27,
  MicrobeBlob28,
  MicrobeBlob29,
  MicrobeBlob30,
]

function microbeIdToSvgIndex(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0x7fffffff
  }
  return hash % microbeComponents.length
}

function assignUniqueSvgIndices(microbes: { id: string }[]): Map<string, number> {
  const used = new Set<number>()
  const result = new Map<string, number>()
  for (const m of microbes) {
    let idx = microbeIdToSvgIndex(m.id)
    while (used.has(idx)) {
      idx = (idx + 1) % microbeComponents.length
    }
    used.add(idx)
    result.set(m.id, idx)
  }
  return result
}

function MicrobeSvgFor(m: Microbe, pool: Microbe[]) {
  const svgMap = assignUniqueSvgIndices(pool)
  const idx = svgMap.get(m.id) ?? microbeIdToSvgIndex(m.id)
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

function attributeRowIcon(attribute: string) {
  switch (attribute) {
    case "Mobility":
      return (
        <svg className="h-5 w-5 shrink-0 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
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
      )
    case "Agility":
      return (
        <svg className="h-5 w-5 shrink-0 text-yellow-500" viewBox="0 0 16 16" fill="currentColor">
          <path d="M9 1L4 9h4l-1 6 5-8H8l1-6z" />
        </svg>
      )
    case "Size":
      return (
        <svg className="h-5 w-5 shrink-0 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1 15L1 1L15 15H1Z" opacity="0.6" />
          <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      )
    default:
      return <span className="inline-block h-5 w-5 shrink-0 rounded-sm bg-gray-400" aria-hidden />
  }
}

const INVIABLE_ATTRIBUTE_TITLE =
  "Inviable: even with the best possible partners, this microbe cannot keep the average within range for this attribute"

function getInviableAttributes(microbe: Microbe, req: ScenarioRequirements): string[] {
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

function categorizeMicrobeForResults(microbe: Microbe, req: ScenarioRequirements) {
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

function MicrobeAttributeRowGrid({
  Mobility,
  Agility,
  Size,
}: {
  Mobility: number
  Agility: number
  Size: number
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-[12px] leading-none">
      <Tooltip text="Mobility">
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
          <span className="tabular-nums leading-none text-gray-700">{Mobility}</span>
        </span>
      </Tooltip>
      <Tooltip text="Agility">
        <span className="inline-flex items-center gap-0.5">
          <svg className="h-3.5 w-3.5 shrink-0 text-yellow-500" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9 1L4 9h4l-1 6 5-8H8l1-6z" />
          </svg>
          <span className="tabular-nums leading-none text-gray-700">{Agility}</span>
        </span>
      </Tooltip>
      <Tooltip text="Size">
        <span className="inline-flex items-center gap-0.5">
          <svg className="h-3.5 w-3.5 shrink-0 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 15L1 1L15 15H1Z" opacity="0.6" />
            <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <span className="tabular-nums leading-none text-gray-700">{Size}</span>
        </span>
      </Tooltip>
    </div>
  )
}

function MicrobeAttributeRow({
  Mobility,
  Agility,
  Size,
  inviableAttributes = [],
  highlightInviable = false,
}: {
  Mobility: number
  Agility: number
  Size: number
  inviableAttributes?: string[]
  highlightInviable?: boolean
}) {
  const inv = inviableAttributes
  const valueSpan = (name: "Mobility" | "Agility" | "Size", value: number) =>
    highlightInviable && inv.includes(name) ? (
      <span
        className="tabular-nums leading-none"
        style={{ color: "#dc2626", fontWeight: "bold" }}
        title={INVIABLE_ATTRIBUTE_TITLE}
      >
        • {value}
      </span>
    ) : (
      <span className="tabular-nums leading-none text-gray-700">{value}</span>
    )

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-[12px] leading-none">
      <Tooltip text="Mobility">
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
          {valueSpan("Mobility", Mobility)}
        </span>
      </Tooltip>
      <Tooltip text="Agility">
        <span className="inline-flex items-center gap-0.5">
          <svg className="h-3.5 w-3.5 shrink-0 text-yellow-500" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9 1L4 9h4l-1 6 5-8H8l1-6z" />
          </svg>
          {valueSpan("Agility", Agility)}
        </span>
      </Tooltip>
      <Tooltip text="Size">
        <span className="inline-flex items-center gap-0.5">
          <svg className="h-3.5 w-3.5 shrink-0 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 15L1 1L15 15H1Z" opacity="0.6" />
            <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          {valueSpan("Size", Size)}
        </span>
      </Tooltip>
    </div>
  )
}

function SlotAttributeRow({
  Mobility,
  Agility,
  Size,
  inviableAttributes = [],
}: {
  Mobility: number
  Agility: number
  Size: number
  inviableAttributes?: string[]
}) {
  const inv = new Set(inviableAttributes)
  const stat = (name: "Mobility" | "Agility" | "Size", value: number) =>
    inv.has(name) ? (
      <span
        className="font-bold tabular-nums decoration-dotted underline-offset-2"
        style={{ color: "#dc2626" }}
        title={INVIABLE_ATTRIBUTE_TITLE}
      >
        ⓘ {value}
      </span>
    ) : (
      <span className="font-bold tabular-nums text-gray-800">{value}</span>
    )
  return (
    <div className="flex w-full flex-col gap-1 px-2 text-[12px] leading-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <svg className="size-[13px] shrink-0 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
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
          <span className="text-gray-600">Mobility</span>
        </div>
        {stat("Mobility", Mobility)}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <svg className="size-[13px] shrink-0 text-yellow-500" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9 1L4 9h4l-1 6 5-8H8l1-6z" />
          </svg>
          <span className="text-gray-600">Agility</span>
        </div>
        {stat("Agility", Agility)}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <svg className="size-[13px] shrink-0 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 15L1 1L15 15H1Z" opacity="0.6" />
            <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <span className="text-gray-600">Size</span>
        </div>
        {stat("Size", Size)}
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
          aria-label={`${attrName} profile range (length 3)`}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
      ) : null}
    </div>
  )
}

function ToggleSwitch({ on, disabled }: { on: boolean; disabled?: boolean }) {
  return (
    <span
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors ${
        on ? "border-[#4ECDC4] bg-[#4ECDC4]" : "border-gray-300 bg-gray-200"
      } ${disabled ? "opacity-50" : ""}`}
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

// ─── Phase wrappers ───────────────────────────────────────────────────────────

function GamePhase1ProfilingPanel({
  scenario,
  stickySiteNumber,
  traits,
  attributesListForKey,
  scenariosFileTraits,
  onComplete,
}: {
  scenario: ScenarioRequirements
  stickySiteNumber: number
  traits: string[]
  attributesListForKey: string[]
  scenariosFileTraits: string[]
  onComplete: (score: import("@/lib/game-scoring").Phase1Score, picks: GSelectionItem[]) => void
}) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set())
  const [sliderPositions, setSliderPositions] = useState<Record<string, number>>({
    Mobility: 4,
    Agility: 4,
    Size: 4,
  })

  const [keyExpanded, setKeyExpanded] = useState(false)

  useEffect(() => {
    setSliderPositions({
      Mobility: 4,
      Agility: 4,
      Size: 4,
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
  const traitList = traits
  const canSubmit = selectedKeys.size === 2
  const keyTraits = scenariosFileTraits.length ? scenariosFileTraits : traitList

  return (
    <div className="relative min-h-[calc(100vh-8rem)] w-full overflow-y-auto pb-10">
      <div className="pointer-events-none absolute inset-0 z-[1] opacity-20">
        <div className="absolute top-20 left-20 h-48 w-32 rounded-lg bg-orange-500/30" />
        <div className="absolute top-32 left-60 h-32 w-20 rounded-lg bg-blue-400/30" />
        <div className="absolute right-40 bottom-40 h-24 w-40 rounded-lg bg-red-400/30" />
        <div className="absolute bottom-20 left-40 h-16 w-24 rounded bg-yellow-500/30" />
      </div>

      <div className="absolute top-20 left-6 z-10 w-64 rounded-xl bg-[rgba(20,20,40,0.92)] p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">P</div>
          <h2 className="font-bold text-white">Profile</h2>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm text-gray-400">Task Instructions</span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-white/90">
          Select 2 microbe characteristics to program into the Database for your current Profile. The Site Information
          is shown on the notepad taped to the monitor.
        </p>
        <button type="button" className="flex cursor-pointer items-center gap-2 text-blue-400 hover:text-blue-300">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
            <HelpCircle className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm">Help</span>
        </button>
      </div>

      <div className="absolute top-20 right-6 z-10 w-[15rem] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg bg-[#FFF9C4] p-4 shadow-lg">
        <h3 className="mb-2 text-sm font-bold text-gray-800 uppercase">Site {stickySiteNumber} Information</h3>
        <p className="mb-3 text-xs font-medium text-gray-700">{req.name}</p>
        <div className="mb-3">
          <div className="mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-800" />
            <span className="text-sm font-bold text-gray-800">ATTRIBUTES</span>
          </div>
          <div className="space-y-0.5 pl-3 text-sm text-gray-700">
            <p>
              Mobility: {req.attributes.Mobility.min}–{req.attributes.Mobility.max}
            </p>
            <p>
              Agility: {req.attributes.Agility.min}–{req.attributes.Agility.max}
            </p>
            <p>
              Size: {req.attributes.Size.min}–{req.attributes.Size.max}
            </p>
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-800" />
            <span className="text-sm font-bold text-gray-800">TRAIT</span>
          </div>
          <div className="space-y-2 pl-3 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-600">Desired</p>
              <p className="flex items-center gap-1 font-medium" style={{ color: traitColor(req.desired_trait) }}>
                {traitIcon(req.desired_trait, "h-3 w-3 shrink-0")}
                {req.desired_trait}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">Undesired</p>
              <p className="flex items-center gap-1 font-medium" style={{ color: traitColor(req.undesired_trait) }}>
                {traitIcon(req.undesired_trait, "h-3 w-3 shrink-0")}
                {req.undesired_trait}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-[5] mx-auto mt-3 mb-3 w-[min(900px,calc(100%-18rem))] rounded-2xl border border-white/30 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Characteristics</h2>

        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-600">Attributes</p>
        <div className="mb-5 space-y-2">
          {ATTR_NAMES.map((name) => {
            const r = req.attributes[name]
            const k = selectionKey("attribute", name)
            const on = selectedKeys.has(k)
            const start = clampSliderStart(sliderPositions[name] ?? r.min)
            return (
              <div
                key={name}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-colors ${
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
        <div className="mb-5 space-y-2">
          {traitList.map((trait) => {
            const k = selectionKey("trait", trait)
            const on = selectedKeys.has(k)
            const tc = traitColor(trait)
            return (
              <div
                key={trait}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
                  on ? "border-[#4ECDC4] bg-[#4ECDC4]/10" : "border-gray-200 bg-white"
                }`}
              >
                <TraitBadgeChip trait={trait} chipClassName="h-8 w-8" />
                <span className="min-w-0 flex-1 font-medium break-words" style={{ color: tc }}>
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

        <div className="flex justify-center border-t border-gray-200 pt-4">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className={`min-w-[200px] rounded-lg px-10 py-2.5 text-sm font-semibold transition-colors ${
              canSubmit
                ? "cursor-pointer bg-[rgba(20,30,50,0.9)] text-white hover:bg-[rgba(30,40,60,0.95)]"
                : "cursor-not-allowed bg-gray-300 text-gray-500"
            }`}
          >
            Submit
          </button>
        </div>
      </div>

      <div className="absolute right-6 bottom-8 z-20">
        <div
          className={`overflow-hidden rounded-xl bg-[rgba(20,30,50,0.92)] backdrop-blur-sm transition-all ${
            keyExpanded ? "w-48" : "w-20"
          }`}
        >
          <button
            type="button"
            onClick={() => setKeyExpanded(!keyExpanded)}
            className="flex w-full items-center justify-between px-4 py-2 font-medium text-white"
          >
            <span>Key</span>
            {keyExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          {keyExpanded ? (
            <div className="space-y-3 px-4 pb-4">
              <div>
                <p className="mb-1 text-xs text-gray-400">Attributes</p>
                <div className="space-y-1 text-sm text-white">
                  {attributesListForKey.map((attr) => (
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
                  {keyTraits.map((trait) => (
                    <div key={trait} className="flex items-center gap-2">
                      <div style={{ color: traitColor(trait) }}>{traitIcon(trait, "h-4 w-4 shrink-0")}</div>
                      <span>{trait}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {DEV_MODE ? (
        <button
          type="button"
          className={DEV_SKIP_BTN_CLASS}
          onClick={() => {
            const { score, picks } = devPhase1SkipScoreAndPicks(scenario)
            onComplete(score, picks)
          }}
        >
          Skip →
        </button>
      ) : null}
    </div>
  )
}

type P2Pick = "site1" | "site2" | "return"

function formatInsightRevealLine(r: RevealedCharacteristic): string {
  if (r.type === "trait") return String(r.value)
  const v = r.value as { min: number; max: number }
  return `${r.name}: ${v.min}–${v.max}`
}

function insightRevealTypeUpper(r: RevealedCharacteristic): string {
  return r.type === "trait" ? "TRAIT" : "ATTRIBUTE"
}

function collapsedBlobCard(m: Microbe, poolMs: Microbe[]) {
  const svgMap = assignUniqueSvgIndices(poolMs)
  const bi = svgMap.get(m.id) ?? microbeIdToSvgIndex(m.id)
  const SvgC = microbeComponents[bi % microbeComponents.length] ?? MicrobeBlob1
  const c = MICROBE_PALETTE[bi % MICROBE_PALETTE.length] ?? "#808080"
  return <SvgC color={c} />
}

function GamePhase2Panel({
  pool,
  scenario,
  displaySiteNum,
  attributesListForKey,
  traitListFull,
  isLastSite,
  onComplete,
}: {
  pool: CategorizationPool
  scenario: ScenarioRequirements
  displaySiteNum: number
  attributesListForKey: string[]
  traitListFull: string[]
  isLastSite: boolean
  onComplete: (result: import("@/lib/game-scoring").Phase2Score, tagged: Microbe[], rows: Phase2DecisionRow[]) => void
}) {
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<P2Pick | null>(null)
  const [decisions, setDecisions] = useState<{ id: string; choice: P2Pick }[]>([])
  const [bucketState, setBucketState] = useState<{ b1: Microbe[]; b2: Microbe[]; ret: Microbe[] }>({
    b1: [],
    b2: [],
    ret: [],
  })
  const [expandedColumnIds, setExpandedColumnIds] = useState<Set<string>>(() => new Set())
  const [keyExpanded, setKeyExpanded] = useState(false)

  const displayedMicrobe = pool.microbes[idx] ?? null
  const p2SvgMap = useMemo(() => assignUniqueSvgIndices(pool.microbes), [pool.microbes])
  const ix = displayedMicrobe ? (p2SvgMap.get(displayedMicrobe.id) ?? 0) : 0
  const Svg = microbeComponents[ix % microbeComponents.length] ?? MicrobeBlob1
  const col = MICROBE_PALETTE[ix % MICROBE_PALETTE.length] ?? "#808080"

  const siteStickyReq = pool.site1_requirements
  const nextReq = pool.site2_requirements
  const revealedForInsight = pool.revealed_characteristic as RevealedCharacteristic
  const showInsightSection = Boolean(nextReq && revealedForInsight)

  const site1Label = `Site ${displaySiteNum}`
  const site2Label = `Site ${displaySiteNum + 1}`

  type ColumnMicrobe = { m: Microbe; poolMs: Microbe[] }

  const columnsPhase2: { title: string; badge: string; items: ColumnMicrobe[] }[] = [
    {
      title: site1Label,
      badge: "Microbes Categorized",
      items: bucketState.b1.map((m) => ({ m, poolMs: pool.microbes })),
    },
    ...(isLastSite
      ? []
      : [
          {
            title: site2Label,
            badge: "Microbes Categorized",
            items: bucketState.b2.map((m) => ({ m, poolMs: pool.microbes })),
          },
        ]),
    {
      title: "Return",
      badge: "Microbes Returned",
      items: bucketState.ret.map((m) => ({ m, poolMs: pool.microbes })),
    },
  ]

  const toggleExpand = (uid: string) => {
    setExpandedColumnIds((prev) => {
      const n = new Set(prev)
      if (n.has(uid)) n.delete(uid)
      else n.add(uid)
      return n
    })
  }

  const keyTraits = useMemo(() => {
    const inPool = new Set(pool.microbes.map((m) => m.trait))
    const ordered = traitListFull.filter((t) => inPool.has(t))
    const extras = [...inPool].filter((t) => !traitListFull.includes(t)).sort()
    return [...ordered, ...extras]
  }, [pool.microbes, traitListFull])

  const remainingCount = Math.max(0, 10 - idx)

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
    if (!displayedMicrobe || picked === null) return
    const nextDec = [...decisions, { id: displayedMicrobe.id, choice: picked }]
    const k = picked === "site1" ? "b1" : picked === "site2" ? "b2" : "ret"
    const nextBuckets = {
      ...bucketState,
      [k]: [...bucketState[k], displayedMicrobe],
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
    <div className="relative min-h-[calc(100vh-8rem)] w-full overflow-auto pb-[18rem]">
      <div className="pointer-events-none absolute inset-0 z-[1] opacity-20">
        <div className="absolute top-20 left-20 h-48 w-32 rounded-lg bg-orange-500/30" />
        <div className="absolute top-32 left-60 h-32 w-20 rounded-lg bg-blue-400/30" />
        <div className="absolute right-40 bottom-40 h-24 w-40 rounded-lg bg-red-400/30" />
        <div className="absolute bottom-20 left-40 h-16 w-24 rounded bg-yellow-500/30" />
      </div>

      <div className="absolute top-20 left-6 z-10 w-64 rounded-xl bg-[rgba(20,20,40,0.92)] p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 font-bold text-white">P</div>
          <h2 className="font-bold text-white">Microbe Profile</h2>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm text-gray-400">Task Instructions</span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-white/90">
          <span className="font-semibold">Categorize Microbes.</span> Categorize 10 microbes into Current Site, Next Site, or
          Return based on the site information panel.
        </p>
        <button type="button" className="flex cursor-pointer items-center gap-2 text-blue-400 hover:text-blue-300">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
            <HelpCircle className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm">Help</span>
        </button>
      </div>

      <div className="absolute top-20 right-6 z-10 w-[15rem] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg bg-[#FFF9C4] p-4 shadow-lg">
        <h3 className="mb-2 text-sm font-bold text-gray-800 uppercase">Site {displaySiteNum} Information</h3>
        <p className="mb-3 text-xs font-medium text-gray-700">{scenario.name}</p>
        <div className="mb-3">
          <div className="mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-800" />
            <span className="text-sm font-bold text-gray-800">ATTRIBUTES</span>
          </div>
          <div className="space-y-0.5 pl-3 text-sm text-gray-700">
            <p>
              Mobility: {siteStickyReq.attributes.Mobility.min}–{siteStickyReq.attributes.Mobility.max}
            </p>
            <p>
              Agility: {siteStickyReq.attributes.Agility.min}–{siteStickyReq.attributes.Agility.max}
            </p>
            <p>
              Size: {siteStickyReq.attributes.Size.min}–{siteStickyReq.attributes.Size.max}
            </p>
          </div>
        </div>
        <div className="mb-3">
          <div className="mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-800" />
            <span className="text-sm font-bold text-gray-800">TRAIT</span>
          </div>
          <div className="space-y-2 pl-3 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-600">Desired</p>
              <p className="flex items-center gap-1 font-medium" style={{ color: traitColor(siteStickyReq.desired_trait) }}>
                {traitIcon(siteStickyReq.desired_trait, "h-3 w-3 shrink-0")}
                {siteStickyReq.desired_trait}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">Undesired</p>
              <p
                className="flex items-center gap-1 font-medium"
                style={{ color: traitColor(siteStickyReq.undesired_trait) }}
              >
                {traitIcon(siteStickyReq.undesired_trait, "h-3 w-3 shrink-0")}
                {siteStickyReq.undesired_trait}
              </p>
            </div>
          </div>
        </div>
        {showInsightSection ? (
          <div className="border-t border-amber-200/80 pt-3">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-800">
              Site {displaySiteNum + 1} Insight
            </h4>
            <p className="text-xs font-medium text-gray-600">{insightRevealTypeUpper(revealedForInsight)}</p>
            <p className="text-sm font-semibold text-gray-800">{formatInsightRevealLine(revealedForInsight)}</p>
          </div>
        ) : null}
      </div>

      <div className="relative z-[5] mx-auto mt-[4.5rem] mb-4 flex min-h-0 w-[min(900px,calc(100%-18rem))] gap-6 rounded-2xl border border-white/30 bg-white/95 p-5 shadow-xl backdrop-blur-sm">
        <div className="flex w-[220px] shrink-0 flex-col">
          <div className="mb-2 flex flex-wrap items-baseline gap-2">
            <h2 className="text-lg font-bold text-gray-900">Categorize Microbes</h2>
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
              Microbes remaining: {remainingCount}
            </span>
          </div>

          {displayedMicrobe ? (
            <div className="flex flex-1 flex-col rounded-xl border border-gray-200 bg-gray-50/80 p-4 shadow-inner">
              <p className="mb-3 text-center text-base font-bold text-gray-900">{displayedMicrobe.name}</p>
              <div className="mb-3 flex justify-center [&>svg]:h-20 [&>svg]:w-20">
                <Svg color={col} />
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Attributes</p>
              <SlotAttributeRow
                Mobility={displayedMicrobe.Mobility}
                Agility={displayedMicrobe.Agility}
                Size={displayedMicrobe.Size}
              />
              <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-gray-500">Trait</p>
              <div className="flex items-center gap-2">
                <TraitBadgeChip trait={displayedMicrobe.trait} chipClassName="h-8 w-8" />
                <span className="text-sm font-medium" style={{ color: traitColor(displayedMicrobe.trait) }}>
                  {displayedMicrobe.trait}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nothing to categorize.</p>
          )}

          <p className="mb-2 mt-5 text-sm font-semibold text-gray-800">Select Category</p>
          <div className="flex shrink-0 flex-col gap-2">
            <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-gray-800">
              <input
                type="radio"
                name="p2cat-game"
                checked={picked === "site1"}
                onChange={() => setPicked("site1")}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span className="min-w-0 break-words">{site1Label}</span>
            </label>
            {isLastSite ? null : (
              <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-gray-800">
                <input
                  type="radio"
                  name="p2cat-game"
                  checked={picked === "site2"}
                  onChange={() => setPicked("site2")}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span className="min-w-0 break-words">{site2Label}</span>
              </label>
            )}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="p2cat-game"
                checked={picked === "return"}
                onChange={() => setPicked("return")}
                className="h-4 w-4"
              />
              Return
            </label>
          </div>

          <button
            type="button"
            disabled={!displayedMicrobe || picked === null}
            onClick={submitOne}
            className={`mt-4 w-full shrink-0 rounded-lg py-3 text-sm font-semibold transition-colors ${
              displayedMicrobe && picked !== null
                ? "cursor-pointer bg-[rgba(20,30,50,0.9)] text-white hover:bg-[rgba(30,40,60,0.95)]"
                : "cursor-not-allowed bg-gray-300 text-gray-500"
            }`}
          >
            Submit Selection
          </button>
        </div>

        <div className="flex min-w-0 flex-1 gap-3">
          {columnsPhase2.map((colDef) => (
            <div key={colDef.title} className="flex min-w-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white/60 p-3">
              <div className="mb-3 flex flex-col gap-1 border-b border-gray-200 pb-2">
                <h3 className="text-sm font-bold text-gray-900">{colDef.title}</h3>
                <span className="inline-flex max-w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  {colDef.badge}: {colDef.items.length}
                </span>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: "min(560px,calc(100vh-13rem))" }}>
                {colDef.items.map(({ m, poolMs }) => {
                  const uid = `${colDef.title}-${m.id}-${m.name}`
                  const open = expandedColumnIds.has(uid)
                  return (
                    <div key={uid} className="rounded-lg border border-gray-200 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleExpand(uid)}
                        className="flex w-full items-center gap-2 px-2 py-2 text-left hover:bg-gray-50"
                      >
                        <span className="[&>svg]:block [&>svg]:h-10 [&>svg]:w-10">
                          <span className="flex shrink-0 scale-90">{collapsedBlobCard(m, poolMs)}</span>
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">{m.name}</span>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
                      </button>
                      {open ? (
                        <div className="space-y-2 border-t border-gray-100 px-3 py-3 text-sm">
                          <SlotAttributeRow Mobility={m.Mobility} Agility={m.Agility} Size={m.Size} />
                          <div className="flex items-center gap-2 pt-1">
                            <TraitBadgeChip trait={m.trait} />
                            <span style={{ color: traitColor(m.trait) }} className="text-xs font-medium">
                              {m.trait}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute right-6 bottom-8 z-20">
        <div
          className={`overflow-hidden rounded-xl bg-[rgba(20,30,50,0.92)] backdrop-blur-sm transition-all ${
            keyExpanded ? "w-48" : "w-20"
          }`}
        >
          <button
            type="button"
            onClick={() => setKeyExpanded(!keyExpanded)}
            className="flex w-full items-center justify-between px-4 py-2 font-medium text-white"
          >
            <span>Key</span>
            {keyExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          {keyExpanded ? (
            <div className="space-y-3 px-4 pb-4">
              <div>
                <p className="mb-1 text-xs text-gray-400">Attributes</p>
                <div className="space-y-1 text-sm text-white">
                  {attributesListForKey.map((attr) => (
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
                  {keyTraits.map((trait) => (
                    <div key={trait} className="flex items-center gap-2">
                      <div style={{ color: traitColor(trait) }}>{traitIcon(trait, "h-4 w-4 shrink-0")}</div>
                      <span>{trait}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {DEV_MODE ? (
        <button
          type="button"
          className={DEV_SKIP_BTN_CLASS}
          onClick={() => {
            const { score, tagged, rows } = devPhase2PerfectComplete(pool)
            onComplete(score, tagged, rows)
          }}
        >
          Skip →
        </button>
      ) : null}
    </div>
  )
}

function GamePhase0Panel({
  taggedMicrobes,
  scenario,
  displaySiteNum,
  blobPalettePool,
  attributesListForKey,
  traitListFull,
  onComplete,
}: {
  taggedMicrobes: Microbe[]
  scenario: ScenarioRequirements
  displaySiteNum: number
  blobPalettePool: Microbe[]
  attributesListForKey: string[]
  traitListFull: string[]
  onComplete: (score: import("@/lib/game-scoring").Phase0Score) => void
}) {
  const [i, setI] = useState(0)
  const [rows, setRows] = useState<Phase0DecisionInput[]>([])
  const [choice, setChoice] = useState<"keep" | "return" | null>(null)
  const [expandedColumnIds, setExpandedColumnIds] = useState<Set<string>>(() => new Set())
  const [keyExpanded, setKeyExpanded] = useState(false)

  const m = taggedMicrobes[i]
  const req = scenarioToSiteReq(scenario)
  const siteStickyReq = scenario
  const p0SvgMap = useMemo(() => assignUniqueSvgIndices(blobPalettePool), [blobPalettePool])

  const site1Label = `Site ${displaySiteNum}`
  type ColumnMicrobe = { m: Microbe; poolMs: Microbe[] }

  const p0KeepCols: ColumnMicrobe[] = rows
    .filter((d) => d.playerChoice === "keep")
    .map((d) => ({ m: d.microbe as Microbe, poolMs: blobPalettePool }))
  const p0DiscardCols: ColumnMicrobe[] = rows
    .filter((d) => d.playerChoice === "return")
    .map((d) => ({ m: d.microbe as Microbe, poolMs: blobPalettePool }))

  const columnsPhase0: { title: string; badge: string; items: ColumnMicrobe[] }[] = [
    { title: site1Label, badge: "Confirmed", items: p0KeepCols },
    { title: "Return", badge: "Discarded", items: p0DiscardCols },
  ]

  const toggleExpand = (uid: string) => {
    setExpandedColumnIds((prev) => {
      const n = new Set(prev)
      if (n.has(uid)) n.delete(uid)
      else n.add(uid)
      return n
    })
  }

  const keyTraits = useMemo(() => {
    const union = [...taggedMicrobes, ...blobPalettePool]
    const inPool = new Set(union.map((x) => x.trait))
    const ordered = traitListFull.filter((t) => inPool.has(t))
    const extras = [...inPool].filter((t) => !traitListFull.includes(t)).sort()
    return [...ordered, ...extras]
  }, [blobPalettePool, taggedMicrobes, traitListFull])

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

  const displayedMicrobe = m
  const ix = displayedMicrobe ? (p0SvgMap.get(displayedMicrobe.id) ?? 0) : 0
  const Svg = microbeComponents[ix % microbeComponents.length] ?? MicrobeBlob1
  const col = MICROBE_PALETTE[ix % MICROBE_PALETTE.length] ?? "#808080"
  const remainingCount = Math.max(0, taggedMicrobes.length - i)

  const p2SelectedEquivalent = choice === "keep" ? ("keep" as const) : choice === "return" ? ("discard" as const) : null

  return (
    <div className="relative min-h-[calc(100vh-8rem)] w-full overflow-auto pb-[18rem]">
      <div className="pointer-events-none absolute inset-0 z-[1] opacity-20">
        <div className="absolute top-20 left-20 h-48 w-32 rounded-lg bg-orange-500/30" />
        <div className="absolute top-32 left-60 h-32 w-20 rounded-lg bg-blue-400/30" />
        <div className="absolute right-40 bottom-40 h-24 w-40 rounded-lg bg-red-400/30" />
        <div className="absolute bottom-20 left-40 h-16 w-24 rounded bg-yellow-500/30" />
      </div>

      <div className="absolute top-20 left-6 z-10 w-64 rounded-xl bg-[rgba(20,20,40,0.92)] p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 font-bold text-white">P</div>
          <h2 className="font-bold text-white">Review Microbes</h2>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm text-gray-400">Task Instructions</span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-white/90">
          <span className="font-semibold">Review Microbes.</span> Review microbes you reserved for this site. With full site
          information now available, confirm or discard each one.
        </p>
        <button type="button" className="flex cursor-pointer items-center gap-2 text-blue-400 hover:text-blue-300">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
            <HelpCircle className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm">Help</span>
        </button>
      </div>

      <div className="absolute top-20 right-6 z-10 w-[15rem] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg bg-[#FFF9C4] p-4 shadow-lg">
        <h3 className="mb-2 text-sm font-bold text-gray-800 uppercase">Site {displaySiteNum} Information</h3>
        <p className="mb-3 text-xs font-medium text-gray-700">{scenario.name}</p>
        <div className="mb-3">
          <div className="mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-800" />
            <span className="text-sm font-bold text-gray-800">ATTRIBUTES</span>
          </div>
          <div className="space-y-0.5 pl-3 text-sm text-gray-700">
            <p>
              Mobility: {siteStickyReq.attributes.Mobility.min}–{siteStickyReq.attributes.Mobility.max}
            </p>
            <p>
              Agility: {siteStickyReq.attributes.Agility.min}–{siteStickyReq.attributes.Agility.max}
            </p>
            <p>
              Size: {siteStickyReq.attributes.Size.min}–{siteStickyReq.attributes.Size.max}
            </p>
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-800" />
            <span className="text-sm font-bold text-gray-800">TRAIT</span>
          </div>
          <div className="space-y-2 pl-3 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-600">Desired</p>
              <p className="flex items-center gap-1 font-medium" style={{ color: traitColor(siteStickyReq.desired_trait) }}>
                {traitIcon(siteStickyReq.desired_trait, "h-3 w-3 shrink-0")}
                {siteStickyReq.desired_trait}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">Undesired</p>
              <p className="flex items-center gap-1 font-medium" style={{ color: traitColor(siteStickyReq.undesired_trait) }}>
                {traitIcon(siteStickyReq.undesired_trait, "h-3 w-3 shrink-0")}
                {siteStickyReq.undesired_trait}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-[5] mx-auto mt-[4.5rem] mb-4 flex min-h-0 w-[min(900px,calc(100%-18rem))] gap-6 rounded-2xl border border-white/30 bg-white/95 p-5 shadow-xl backdrop-blur-sm">
        <div className="flex w-[220px] shrink-0 flex-col">
          <div className="mb-2 flex flex-wrap items-baseline gap-2">
            <h2 className="text-lg font-bold text-gray-900">Review Microbes</h2>
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
              Microbes remaining: {remainingCount}
            </span>
          </div>

          {displayedMicrobe ? (
            <div className="flex flex-1 flex-col rounded-xl border border-gray-200 bg-gray-50/80 p-4 shadow-inner">
              <p className="mb-3 text-center text-base font-bold text-gray-900">{displayedMicrobe.name}</p>
              <div className="mb-3 flex justify-center [&>svg]:h-20 [&>svg]:w-20">
                <Svg color={col} />
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Attributes</p>
              <SlotAttributeRow {...displayedMicrobe} />
              <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-gray-500">Trait</p>
              <div className="flex items-center gap-2">
                <TraitBadgeChip trait={displayedMicrobe.trait} chipClassName="h-8 w-8" />
                <span className="text-sm font-medium" style={{ color: traitColor(displayedMicrobe.trait) }}>
                  {displayedMicrobe.trait}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nothing to review.</p>
          )}

          <p className="mb-2 mt-5 text-sm font-semibold text-gray-800">Select Category</p>
          <div className="flex shrink-0 flex-col gap-2">
            <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-gray-800">
              <input
                type="radio"
                name="p0cat-game"
                checked={p2SelectedEquivalent === "keep"}
                onChange={() => setChoice("keep")}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span className="min-w-0 break-words">{site1Label}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="p0cat-game"
                checked={p2SelectedEquivalent === "discard"}
                onChange={() => setChoice("return")}
                className="h-4 w-4"
              />
              Return
            </label>
          </div>

          <button
            type="button"
            disabled={!displayedMicrobe || choice === null}
            onClick={confirm}
            className={`mt-4 w-full shrink-0 rounded-lg py-3 text-sm font-semibold transition-colors ${
              displayedMicrobe && choice !== null
                ? "cursor-pointer bg-[rgba(20,30,50,0.9)] text-white hover:bg-[rgba(30,40,60,0.95)]"
                : "cursor-not-allowed bg-gray-300 text-gray-500"
            }`}
          >
            Submit Selection
          </button>
        </div>

        <div className="flex min-w-0 flex-1 gap-3">
          {columnsPhase0.map((colDef) => (
            <div key={colDef.title} className="flex min-w-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white/60 p-3">
              <div className="mb-3 flex flex-col gap-1 border-b border-gray-200 pb-2">
                <h3 className="text-sm font-bold text-gray-900">{colDef.title}</h3>
                <span className="inline-flex max-w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  {colDef.badge}: {colDef.items.length}
                </span>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: "min(560px,calc(100vh-13rem))" }}>
                {colDef.items.map(({ m: mm, poolMs }) => {
                  const uid = `${colDef.title}-${mm.id}-${mm.name}`
                  const open = expandedColumnIds.has(uid)
                  return (
                    <div key={uid} className="rounded-lg border border-gray-200 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleExpand(uid)}
                        className="flex w-full items-center gap-2 px-2 py-2 text-left hover:bg-gray-50"
                      >
                        <span className="[&>svg]:block [&>svg]:h-10 [&>svg]:w-10">
                          <span className="flex shrink-0 scale-90">{collapsedBlobCard(mm, poolMs)}</span>
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">{mm.name}</span>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
                      </button>
                      {open ? (
                        <div className="space-y-2 border-t border-gray-100 px-3 py-3 text-sm">
                          <SlotAttributeRow Mobility={mm.Mobility} Agility={mm.Agility} Size={mm.Size} />
                          <div className="flex items-center gap-2 pt-1">
                            <TraitBadgeChip trait={mm.trait} />
                            <span style={{ color: traitColor(mm.trait) }} className="text-xs font-medium">
                              {mm.trait}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute right-6 bottom-8 z-20">
        <div
          className={`overflow-hidden rounded-xl bg-[rgba(20,30,50,0.92)] backdrop-blur-sm transition-all ${
            keyExpanded ? "w-48" : "w-20"
          }`}
        >
          <button
            type="button"
            onClick={() => setKeyExpanded(!keyExpanded)}
            className="flex w-full items-center justify-between px-4 py-2 font-medium text-white"
          >
            <span>Key</span>
            {keyExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          {keyExpanded ? (
            <div className="space-y-3 px-4 pb-4">
              <div>
                <p className="mb-1 text-xs text-gray-400">Attributes</p>
                <div className="space-y-1 text-sm text-white">
                  {attributesListForKey.map((attr) => (
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
                  {keyTraits.map((trait) => (
                    <div key={trait} className="flex items-center gap-2">
                      <div style={{ color: traitColor(trait) }}>{traitIcon(trait, "h-4 w-4 shrink-0")}</div>
                      <span>{trait}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {DEV_MODE ? (
        <button type="button" className={DEV_SKIP_BTN_CLASS} onClick={() => onComplete(devPhase0AllKeep(taggedMicrobes, scenario))}>
          Skip →
        </button>
      ) : null}
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

function devPhase1PerfectPicks(scenario: ScenarioRequirements): GSelectionItem[] {
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
function devPhase1SkipScoreAndPicks(scenario: ScenarioRequirements): { score: Phase1Score; picks: GSelectionItem[] } {
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

function devPhase3AutoPool(prospect: ProspectScenarioJson, scenario: ScenarioRequirements): { score: Phase3Score; pool: Microbe[] } {
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

function devScoreAtPct75<T extends { percentage: number }>(s: T): T {
  return { ...s, percentage: 75 }
}

function buildDevFinishedThreeSites(cfg: GameConfig): {
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

function GamePhase3PoolPanel({
  prospect,
  scenario,
  displaySiteNum,
  attributesListForKey,
  scenariosFileTraits,
  onComplete,
}: {
  prospect: ProspectScenarioJson
  scenario: ScenarioRequirements
  displaySiteNum: number
  attributesListForKey: string[]
  scenariosFileTraits: string[]
  onComplete: (score: import("@/lib/game-scoring").Phase3Score, pool: Microbe[], svgMap: Map<string, number>) => void
}) {
  const [pool, setPool] = useState<Microbe[]>(() => [...prospect.preloaded_microbes])
  const [roundIdx, setRoundIdx] = useState(0)
  const [pickId, setPickId] = useState<string | null>(null)
  const [picks, setPicks] = useState<string[]>([])
  const [keyExpanded, setKeyExpanded] = useState(false)
  const set = prospect.choose_sets[roundIdx]
  const allP3Microbes = useMemo(() => {
    const seen = new Map<string, Microbe>()
    for (const m of prospect.preloaded_microbes) seen.set(m.id, m)
    for (const cs of prospect.choose_sets) {
      for (const c of cs.candidates) seen.set(c.microbe.id, c.microbe)
    }
    return [...seen.values()]
  }, [prospect])
  const p3SvgMap = useMemo(() => assignUniqueSvgIndices(allP3Microbes), [allP3Microbes])

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
      onComplete(finalScore, builtOrdered, p3SvgMap)
      return
    }
    setRoundIdx((r) => r + 1)
  }

  if (!set) return null

  const candidates = set.candidates
  const req = scenario

  return (
    <div className="relative min-h-[calc(100vh-6rem)] w-full overflow-y-auto pb-10">
      <div className="pointer-events-none absolute inset-0 z-[1] opacity-20">
        <div className="absolute top-20 left-20 h-48 w-32 rounded-lg bg-orange-500/30" />
        <div className="absolute top-32 left-60 h-32 w-20 rounded-lg bg-blue-400/30" />
        <div className="absolute right-40 bottom-40 h-24 w-40 rounded-lg bg-red-400/30" />
        <div className="absolute bottom-20 left-40 h-16 w-24 rounded bg-yellow-500/30" />
      </div>

      <div className="absolute top-20 left-6 z-10 w-64 rounded-xl bg-[rgba(20,20,40,0.92)] p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 font-bold text-white">S</div>
          <h2 className="font-bold text-white">Prospect Selection</h2>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm text-gray-400">Task Instructions</span>
        </div>
        <p className="mb-2 text-sm leading-relaxed text-white/90">
          Select 1 microbe from the 3 candidates above to add to your Prospect Pool.
        </p>
        <p className="mb-4 text-xs text-white/70">
          Round {roundIdx + 1} of {TOTAL_P3_ROUNDS}
        </p>
        <div className="flex cursor-pointer items-center gap-2 text-blue-400 hover:text-blue-300">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
            <HelpCircle className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm">Help</span>
        </div>
      </div>

      <div className="absolute top-20 right-6 z-10 w-56 rounded-lg bg-[#FFF9C4] p-4 shadow-lg">
        <h3 className="mb-3 text-sm font-bold text-gray-800 uppercase">Site {displaySiteNum} Information</h3>
        <p className="mb-3 text-xs font-medium text-gray-700">{req.name}</p>
        <div className="mb-3">
          <div className="mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-800" />
            <span className="text-sm font-bold text-gray-800">ATTRIBUTES</span>
          </div>
          <div className="space-y-0.5 pl-3 text-sm text-gray-700">
            <p>
              Mobility: {req.attributes.Mobility.min}–{req.attributes.Mobility.max}
            </p>
            <p>
              Agility: {req.attributes.Agility.min}–{req.attributes.Agility.max}
            </p>
            <p>
              Size: {req.attributes.Size.min}–{req.attributes.Size.max}
            </p>
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-800" />
            <span className="text-sm font-bold text-gray-800">TRAIT</span>
          </div>
          <div className="space-y-2 pl-3 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-600">Desired</p>
              <p className="flex items-center gap-1 font-medium" style={{ color: traitColor(req.desired_trait) }}>
                {traitIcon(req.desired_trait, "h-3 w-3 shrink-0")}
                {req.desired_trait}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">Undesired</p>
              <p className="flex items-center gap-1 font-medium" style={{ color: traitColor(req.undesired_trait) }}>
                {traitIcon(req.undesired_trait, "h-3 w-3 shrink-0")}
                {req.undesired_trait}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-[5] mx-auto mt-4 mb-4 w-[min(900px,calc(100%-18rem))] rounded-2xl border border-white/40 bg-[rgba(235,247,245,0.88)] p-4 shadow-xl backdrop-blur-sm">
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex gap-4">
            {candidates.map((candidate, idx) => {
              const m = candidate.microbe
              const isSelected = pickId === m.id
              const anotherSelected = pickId !== null && !isSelected
              const svgIdx = p3SvgMap.get(m.id) ?? 0
              const blobColor = MICROBE_PALETTE[svgIdx % MICROBE_PALETTE.length] ?? "#808080"
              const Svg = microbeComponents[svgIdx % microbeComponents.length] ?? MicrobeBlob1
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPickId((prev) => (prev === m.id ? null : m.id))}
                  className={`flex h-[220px] w-[160px] flex-col rounded-xl border-2 bg-white p-2 text-left shadow-lg transition-all ${
                    isSelected ? "border-[#4ECDC4] bg-[#ecfdfb]" : "border-[#d1d5db]"
                  } ${anotherSelected ? "opacity-60" : "opacity-100"}`}
                >
                  <div className="mb-1 w-full text-center text-sm font-bold text-gray-800 line-clamp-1">{m.name}</div>
                  <div className="mb-1 flex shrink-0 justify-center">
                    <Svg color={blobColor} />
                  </div>
                  <div className="mt-auto flex w-full flex-col items-center gap-2 px-1">
                    <SlotAttributeRow Mobility={m.Mobility} Agility={m.Agility} Size={m.Size} />
                    <TraitBadgeChip trait={m.trait} chipClassName="h-8 w-8" />
                  </div>
                </button>
              )
            })}
          </div>
          <button
            type="button"
            disabled={!pickId}
            onClick={confirmRound}
            className={`mt-5 rounded-lg px-6 py-2 font-medium ${
              pickId ? "cursor-pointer bg-[rgba(20,30,50,0.9)] text-white hover:bg-[rgba(30,40,60,0.95)]" : "cursor-not-allowed bg-gray-500/50 text-gray-300"
            }`}
          >
            Confirm Selection
          </button>
        </div>

        <div className="relative z-10 mt-6 flex justify-center overflow-x-auto">
          <div className="grid w-[864px] gap-4 [grid-template-columns:repeat(5,160px)]">
            {Array.from({ length: GRID_SLOTS }, (_, idx) => {
              const m = pool[idx]
              if (!m) {
                return (
                  <div
                    key={`pool-empty-${idx}`}
                    className="h-[160px] w-[160px] rounded-xl border-2 border-dashed border-gray-300 bg-white/40"
                  />
                )
              }
              const svgIdx = p3SvgMap.get(m.id) ?? 0
              const blobColor = MICROBE_PALETTE[svgIdx % MICROBE_PALETTE.length] ?? "#808080"
              const Svg = microbeComponents[svgIdx % microbeComponents.length] ?? MicrobeBlob1
              return (
                <div
                  key={m.id}
                  className="flex h-[160px] w-[160px] cursor-default flex-col rounded-xl border-2 border-[#d1d5db] bg-white p-2 text-left shadow-lg"
                >
                  <div className="mb-1 w-full text-center text-sm font-bold text-gray-800 line-clamp-1">{m.name}</div>
                  <div className="mb-1 flex shrink-0 justify-center">
                    <Svg color={blobColor} />
                  </div>
                  <div className="mt-auto flex w-full items-center justify-between gap-1 px-1">
                    <MicrobeAttributeRow Mobility={m.Mobility} Agility={m.Agility} Size={m.Size} />
                    <TraitBadgeChip trait={m.trait} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="absolute right-6 bottom-8 z-20">
        <div className={`overflow-hidden rounded-xl bg-[rgba(20,30,50,0.92)] backdrop-blur-sm ${keyExpanded ? "w-48" : "w-20"}`}>
          <button type="button" onClick={() => setKeyExpanded((v) => !v)} className="flex w-full items-center justify-between px-4 py-2 text-white">
            <span>Key</span>
            {keyExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          {keyExpanded ? (
            <div className="space-y-3 px-4 pb-4">
              <div>
                <p className="mb-1 text-xs text-gray-400">Attributes</p>
                <div className="space-y-1 text-sm text-white">
                  {attributesListForKey.map((attr) => (
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
                  {keyTraits.map((trait) => (
                    <div key={trait} className="flex items-center gap-2">
                      <div style={{ color: traitColor(trait) }}>{traitIcon(trait, "h-4 w-4 shrink-0")}</div>
                      <span>{trait}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <select className="sr-only" value={scenario.name} disabled aria-hidden>
        {keyTraits.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>

      {DEV_MODE ? (
        <button
          type="button"
          className={DEV_SKIP_BTN_CLASS}
          onClick={() => {
            const { score, pool: p } = devPhase3AutoPool(prospect, scenario)
            onComplete(score, p, p3SvgMap)
          }}
        >
          Skip →
        </button>
      ) : null}
    </div>
  )
}

function GamePhase4TreatmentPanel({
  builtPool,
  svgMap,
  scenario,
  displaySiteNum,
  attributesListForKey,
  scenariosFileTraits,
  onComplete,
}: {
  builtPool: Microbe[]
  svgMap: Map<string, number>
  scenario: ScenarioRequirements
  displaySiteNum: number
  attributesListForKey: string[]
  scenariosFileTraits: string[]
  onComplete: (s: Phase4Score) => void
}) {
  const [selected, setSelected] = useState<Microbe[]>([])
  const [keyExpanded, setKeyExpanded] = useState(false)
  const microbes = builtPool.slice(0, GRID_SLOTS)

  const keyTraits = useMemo(() => {
    const inPool = new Set(microbes.map((m) => m.trait))
    const ordered = scenariosFileTraits.filter((t) => inPool.has(t))
    const extras = [...inPool].filter((t) => !scenariosFileTraits.includes(t)).sort()
    return [...ordered, ...extras]
  }, [microbes, scenariosFileTraits])

  const selectedIds = useMemo(() => new Set(selected.map((m) => m.id)), [selected])

  const trayReserveClass = "h-[160px] w-[160px] shrink-0 opacity-0 pointer-events-none"

  const togglePick = (m: Microbe) => {
    setSelected((prev) => {
      if (prev.some((x) => x.id === m.id)) return prev.filter((x) => x.id !== m.id)
      if (prev.length >= 3) return prev
      return [...prev, m]
    })
  }

  const removeMicrobeId = (id: string) => {
    setSelected((prev) => prev.filter((x) => x.id !== id))
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

  const req = scenario

  return (
    <div className="relative min-h-[calc(100vh-6rem)] w-full overflow-y-auto pb-10">
      <div className="pointer-events-none absolute inset-0 z-[1] opacity-20">
        <div className="absolute top-20 left-20 h-48 w-32 rounded-lg bg-orange-500/30" />
        <div className="absolute top-32 left-60 h-32 w-20 rounded-lg bg-blue-400/30" />
        <div className="absolute right-40 bottom-40 h-24 w-40 rounded-lg bg-red-400/30" />
        <div className="absolute bottom-20 left-40 h-16 w-24 rounded bg-yellow-500/30" />
      </div>

      <div className="absolute top-20 left-6 z-10 w-64 rounded-xl bg-[rgba(20,20,40,0.92)] p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 font-bold text-white">S</div>
          <h2 className="font-bold text-white">Treatment Selection</h2>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm text-gray-400">Task Instructions</span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-white/90">
          <span className="font-semibold">Select 3 microbes</span> whose averaged Attributes and collective Traits most effectively match
          the Site Information.
        </p>
        <div className="flex cursor-pointer items-center gap-2 text-blue-400 hover:text-blue-300">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
            <HelpCircle className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm">Help</span>
        </div>
      </div>

      <div className="absolute top-20 right-6 z-10 w-56 rounded-lg bg-[#FFF9C4] p-4 shadow-lg">
        <h3 className="mb-3 text-sm font-bold text-gray-800 uppercase">Site {displaySiteNum} Information</h3>
        <p className="mb-3 text-xs font-medium text-gray-700">{req.name}</p>
        <div className="mb-3">
          <div className="mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-800" />
            <span className="text-sm font-bold text-gray-800">ATTRIBUTES</span>
          </div>
          <div className="space-y-0.5 pl-3 text-sm text-gray-700">
            <p>
              Mobility: {req.attributes.Mobility.min}–{req.attributes.Mobility.max}
            </p>
            <p>
              Agility: {req.attributes.Agility.min}–{req.attributes.Agility.max}
            </p>
            <p>
              Size: {req.attributes.Size.min}–{req.attributes.Size.max}
            </p>
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-800" />
            <span className="text-sm font-bold text-gray-800">TRAIT</span>
          </div>
          <div className="space-y-2 pl-3 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-600">Desired</p>
              <p className="flex items-center gap-1 font-medium" style={{ color: traitColor(req.desired_trait) }}>
                {traitIcon(req.desired_trait, "h-3 w-3 shrink-0")}
                {req.desired_trait}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">Undesired</p>
              <p className="flex items-center gap-1 font-medium" style={{ color: traitColor(req.undesired_trait) }}>
                {traitIcon(req.undesired_trait, "h-3 w-3 shrink-0")}
                {req.undesired_trait}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-[5] mx-auto mt-4 mb-4 w-[min(900px,calc(100%-18rem))] rounded-2xl border border-white/40 bg-[rgba(235,247,245,0.88)] p-4 shadow-xl backdrop-blur-sm">
        <div className="relative z-10 flex justify-center gap-3">
          {[0, 1, 2].map((slotIndex) => {
            const sel = selected[slotIndex]
            if (!sel) {
              return (
                <div
                  key={`slot-empty-${slotIndex}`}
                  className="flex h-[220px] w-[160px] items-center justify-center rounded-xl border-2 border-dashed border-white/50 bg-white/30 transition-all hover:bg-white/40"
                  aria-label={`Selection slot empty ${slotIndex + 1}`}
                >
                  <span className="h-8 w-8 shrink-0 rounded border-2 border-dashed border-white/40" aria-hidden />
                </div>
              )
            }
            const svgIdx = svgMap.get(sel.id) ?? 0
            const col = MICROBE_PALETTE[svgIdx % MICROBE_PALETTE.length] ?? "#808080"
            const Svg = microbeComponents[svgIdx % microbeComponents.length] ?? MicrobeBlob1
            const inv = getInviableAttributes(sel, scenario)
            return (
              <div
                key={`${sel.id}-slot-${slotIndex}`}
                role="button"
                tabIndex={0}
                onClick={() => removeMicrobeId(sel.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    removeMicrobeId(sel.id)
                  }
                }}
                className="relative flex h-[220px] w-[160px] shrink-0 cursor-pointer flex-col items-center text-center rounded-xl border-2 border-solid border-blue-400 bg-white shadow-lg"
              >
                {inv.length > 0 ? (
                  <div className="absolute top-1 right-1 z-[2]">
                    <Tooltip text="An inviable microbe cannot mathematically contribute to a valid average for one or more attributes, regardless of what other microbes are selected.">
                      <span className="inline-flex text-amber-600">
                        <HelpCircle className="h-4 w-4" />
                      </span>
                    </Tooltip>
                  </div>
                ) : null}
                <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-between gap-1 px-2 py-2 text-center">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center [&>svg]:block [&>svg]:h-full [&>svg]:w-full [&>svg]:max-h-full [&>svg]:max-w-full">
                    <Svg color={col} />
                  </div>
                  <p className="line-clamp-2 w-full text-center text-[14px] font-bold leading-tight text-gray-800">{sel.name}</p>
                  <div className="flex w-full flex-col items-center text-center">
                    <SlotAttributeRow Mobility={sel.Mobility} Agility={sel.Agility} Size={sel.Size} inviableAttributes={inv} />
                  </div>
                  <SlotTraitBadge trait={sel.trait} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="relative z-10 mt-4 flex justify-center">
          <button
            type="button"
            disabled={selected.length !== 3}
            onClick={submit}
            className={`rounded-lg px-6 py-2 font-medium transition-all ${
              selected.length === 3
                ? "cursor-pointer bg-[rgba(20,30,50,0.9)] text-white hover:bg-[rgba(30,40,60,0.95)]"
                : "cursor-not-allowed bg-gray-500/50 text-gray-300"
            }`}
          >
            Submit Treatment
          </button>
        </div>

        <div className="relative z-10 mx-auto mt-6 grid max-w-[900px] grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 px-2">
          {Array.from({ length: GRID_SLOTS }, (_, idx) => {
            const microbe = microbes[idx]
            if (!microbe) {
              return <div key={`cell-${idx}`} className={trayReserveClass} aria-hidden />
            }
            const svgIdx = svgMap.get(microbe.id) ?? 0
            const MicrobeSvg = microbeComponents[svgIdx % microbeComponents.length] ?? MicrobeBlob1
            const blobColor = MICROBE_PALETTE[svgIdx % MICROBE_PALETTE.length] ?? "#808080"
            const isSel = selectedIds.has(microbe.id)
            const invAttrs = getInviableAttributes(microbe, scenario)
            if (isSel) {
              return (
                <div key={microbe.id} className="min-h-[140px] rounded-xl border-2 border-dashed border-white/30 bg-white/20" />
              )
            }
            return (
              <button
                key={microbe.id}
                type="button"
                disabled={selected.length >= 3}
                className="flex min-h-[140px] cursor-pointer flex-col rounded-xl border-2 border-transparent bg-white p-2 text-left shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => togglePick(microbe)}
              >
                <div className="mb-1 w-full text-center text-sm font-bold text-gray-800 line-clamp-1">{microbe.name}</div>
                <div className="mb-1 flex shrink-0 justify-center">
                  <MicrobeSvg color={blobColor} />
                </div>
                <div className="mt-auto flex w-full items-center justify-between gap-1 px-1">
                  <MicrobeAttributeRow
                    Mobility={microbe.Mobility}
                    Agility={microbe.Agility}
                    Size={microbe.Size}
                    inviableAttributes={invAttrs}
                    highlightInviable
                  />
                  <TraitBadgeChip trait={microbe.trait} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="absolute right-6 bottom-8 z-20">
        <div className={`overflow-hidden rounded-xl bg-[rgba(20,30,50,0.92)] backdrop-blur-sm transition-all ${keyExpanded ? "w-48" : "w-20"}`}>
          <button type="button" onClick={() => setKeyExpanded((v) => !v)} className="flex w-full items-center justify-between px-4 py-2 font-medium text-white">
            <span>Key</span>
            {keyExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          {keyExpanded ? (
            <div className="space-y-3 px-4 pb-4">
              <div>
                <p className="mb-1 text-xs text-gray-400">Attributes</p>
                <div className="space-y-1 text-sm text-white">
                  {attributesListForKey.map((attr) => (
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
                  {keyTraits.map((trait) => (
                    <div key={trait} className="flex items-center gap-2">
                      <div style={{ color: traitColor(trait) }}>{traitIcon(trait, "h-4 w-4 shrink-0")}</div>
                      <span>{trait}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <select className="sr-only" value={scenario.name} disabled aria-hidden>
        {[1, 2, 3].map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>

      {DEV_MODE && microbes.length >= 3 ? (
        <button
          type="button"
          className={DEV_SKIP_BTN_CLASS}
          onClick={() =>
            onComplete(
              scorePhase4({
                selectedMicrobes: microbes.slice(0, 3) as Phase4MicrobeInput[],
                allMicrobes: microbes as Phase4MicrobeInput[],
                req: scenarioToSiteReq(scenario),
              }),
            )
          }
        >
          Skip →
        </button>
      ) : null}
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

function microbeResultKey(m: Phase4MicrobeInput & { id?: string }) {
  if (m.id) return `id:${m.id}`
  return `v:${m.Mobility}-${m.Agility}-${m.Size}-${m.trait}`
}

function buildGamePhase4Checklist(p4: Phase4Score, scenario: ScenarioRequirements) {
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

function gameResultsScoreDisplayColorClass(score: number) {
  if (score >= 100) return "text-emerald-600"
  if (score >= 80) return "text-amber-600"
  return "text-red-600"
}

function gameResultsOptimalScoreLineClass(score: number) {
  if (score >= 100) return "text-emerald-600 font-semibold"
  if (score >= 80) return "text-amber-600 font-semibold"
  return "text-red-600 font-semibold"
}

function gameResultsBreakdownBorderClass(player: number, max: number) {
  if (player === max) return "border-l-emerald-500"
  if (player >= 60) return "border-l-amber-400"
  return "border-l-red-500"
}

function phase2ChoiceLabel(choice: "site1" | "site2" | "return", siteNum: number) {
  if (choice === "site1") return `Site ${siteNum}`
  if (choice === "site2") return `Site ${siteNum + 1}`
  return "Return"
}

function phase3RoundFallbackFeedback(rr: import("@/lib/game-scoring").RoundResult): string {
  if (rr.playerPickClassification === "optimal") return "Optimal pick — this microbe gave your pool the best chance of a 100-point treatment."
  if (rr.playerPickClassification === "negative") return "Negative pick — this microbe actively reduces your pool's maximum score. Look for inviable attributes or undesired traits to spot these."
  if (rr.optimalId) return "You missed the optimal candidate. Check the green-highlighted card to see what you should have picked and why."
  if (rr.bestNeutralScore !== null && rr.playerPickNeutralScore !== null && rr.playerPickNeutralScore < rr.bestNeutralScore) {
    return "You picked a neutral candidate, but a stronger neutral was available. Compare conditions satisfied across all three options."
  }
  return "Good pick — no optimal candidate was available, and you chose wisely among the neutrals."
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
    treatmentPool: Microbe[]
    catPoolMicrobes: Microbe[]
    prospectChooseSets: ProspectRoundJson[]
    revealedChar: RevealedCharacteristic | null
  }[]
}) {
  const accentHeading =
    "border-l-4 border-[#4ECDC4] pl-3 text-lg font-bold text-[#1a202c]"
  const sectionCard = "rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm"
  const statCard =
    "rounded-xl border border-[#e2e8f0] border-l-4 border-l-[#4ECDC4] bg-white p-5 text-center shadow-sm"
  const phaseCard = "rounded-xl border border-gray-200 bg-white/95 p-6 shadow-sm"

  const passFailIcon = (pass: boolean) =>
    pass ? (
      <svg className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <circle cx="8" cy="8" r="8" className="text-emerald-100" fill="currentColor" opacity="0.25" />
        <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    ) : (
      <svg className="h-4 w-4 shrink-0 text-red-600" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.12" />
        <path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    )

  return (
    <div className="min-h-screen w-full bg-[#f8fffe] text-gray-900">
      <header className="fixed top-0 right-0 left-0 z-40 flex h-14 shrink-0 items-center justify-between bg-[rgba(20,30,50,0.9)] px-6">
        <h1 className="min-w-0 shrink truncate pr-4 text-lg font-bold text-white sm:text-xl">Simulation Complete!</h1>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => typeof window !== "undefined" && window.location.reload()}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#4ECDC4] px-5 text-sm font-semibold text-[#1a202c] transition-opacity hover:opacity-90"
          >
            Play Again
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-lg border-2 border-white bg-transparent px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Quit
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-[calc(3.5rem+1rem)] sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className={statCard}>
            <p className="text-sm font-medium text-gray-500">Overall Score</p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${gameResultsScoreDisplayColorClass(gameScore.globalAverage)}`}>
              {Math.round(gameScore.globalAverage)}%
            </p>
          </div>
          <div className={statCard}>
            <p className="text-sm font-medium text-gray-500">Total Time</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-gray-800">{formatMmSs(totalSeconds)}</p>
          </div>
          <div className={statCard}>
            <p className="text-sm font-medium text-gray-500">Phase Averages</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
              <span className="rounded-full bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-800">P1: {Math.round(gameScore.perPhaseAverages.phase1)}%</span>
              <span className="rounded-full bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-800">P2: {Math.round(gameScore.perPhaseAverages.phase2)}%</span>
              <span className="rounded-full bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-800">P0: {Math.round(gameScore.perPhaseAverages.phase0)}%</span>
              <span className="rounded-full bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-800">P3: {Math.round(gameScore.perPhaseAverages.phase3)}%</span>
              <span className="rounded-full bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-800">P4: {Math.round(gameScore.perPhaseAverages.phase4)}%</span>
            </div>
          </div>
        </div>

        <div className="mb-8 space-y-2">
          {siteDetail.map((entry, i) => {
            const s = entry.site
            return (
              <div
                key={`breakdown-${s.siteNumber}-${i}`}
                className={`rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm border-l-4 ${gameResultsBreakdownBorderClass(s.siteAverage, 100)}`}
              >
                <div className="grid items-center gap-2" style={{ gridTemplateColumns: "1fr auto auto" }}>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900">Site {i + 1}</div>
                    <div className="text-sm text-gray-500">{s.scenarioName}</div>
                  </div>
                  <span className="text-sm tabular-nums text-gray-400">{formatMmSs(s.timeSpent)}</span>
                  <span className={`text-sm font-semibold tabular-nums ${gameResultsScoreDisplayColorClass(s.siteAverage)}`}>
                    {Math.round(s.siteAverage)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="space-y-4">
          {siteDetail.map((entry, siteIdx) => {
            const s = entry.site
            const req = entry.scenarios
            const pool = entry.treatmentPool.length ? entry.treatmentPool : (s.phase4.selectedMicrobes as Microbe[])
            const checklistRows = buildGamePhase4Checklist(s.phase4, req)
            const optimalMemberKeys = new Set(s.phase4.optimalCombination.map((m) => microbeResultKey(m as Microbe)))
            const selectedKeys = new Set(s.phase4.selectedMicrobes.map((m) => microbeResultKey(m as Microbe)))
            const playerKeysSorted = [...s.phase4.selectedMicrobes].map((m) => microbeResultKey(m as Microbe)).sort().join("\0")
            const optimalKeysSorted = [...s.phase4.optimalCombination].map((m) => microbeResultKey(m as Microbe)).sort().join("\0")
            const playerFoundOptimal =
              playerKeysSorted === optimalKeysSorted && playerKeysSorted.length > 0 && s.phase4.selectedMicrobes.length === 3
            const badgeBase =
              "absolute top-[-12px] z-10 whitespace-nowrap rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow"

            const resolveName = (id: string) =>
              entry.catPoolMicrobes.find((x) => x.id === id)?.name ?? pool.find((m) => m.id === id)?.name ?? id

            const phase0ClassificationBadge = (c: string) => {
              if (c === "good") return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
              if (c === "bad") return "bg-red-100 text-red-800 ring-1 ring-red-200"
              return "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
            }

            return (
              <details
                key={`site-detail-game-${s.siteNumber}-${siteIdx}`}
                open={siteIdx === 0}
                className="group rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm open:pb-6 open:[&>summary>svg]:rotate-180"
              >
                <summary className="flex cursor-pointer list-none select-none items-center justify-between text-xl font-bold text-[#1a202c] transition-colors hover:text-[#4ECDC4] [&::-webkit-details-marker]:hidden">
                  <span>Site {siteIdx + 1}</span>
                  <ChevronDown className="h-6 w-6 shrink-0 text-gray-600 transition-transform group-open:rotate-180" />
                </summary>

                <div className="mt-6 space-y-6">
                  {/* Phase 1 */}
                  <section className={phaseCard}>
                    <div className="mb-4 inline-flex rounded-full bg-[#eefcfb] px-3 py-1 text-sm font-semibold text-[#0f766e] ring-1 ring-[#cceeea]">
                      Phase 1 · {s.phase1.raw}/2 ({Math.round(s.phase1.percentage)}%)
                    </div>
                    <p className="mb-4 text-sm leading-relaxed text-gray-600">
                      In Phase 1 you earn 1 point for selecting the site's desired trait, and 1 point for selecting the most strategically
                      important attribute — the one whose range is furthest from the middle of the 1–10 scale (e.g. 1–3 or 8–10 are more
                      extreme than 4–6). You also need to position the slider at the correct range. The optimal strategy is always: desired
                      trait + most extreme attribute.
                    </p>
                    <div className="flex flex-col gap-3">
                      <div
                        className={`flex gap-3 rounded-lg border px-3 py-2 ${s.phase1.traitCorrect ? "border-gray-200 bg-white" : "border-red-200 bg-red-50/40"}`}
                      >
                        {passFailIcon(s.phase1.traitCorrect)}
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-semibold uppercase tracking-wide ${s.phase1.traitCorrect ? "text-emerald-600" : "text-red-600"}`}>
                            Trait
                          </div>
                          <p className="text-sm text-gray-700">{s.phase1.explanation.trait}</p>
                        </div>
                      </div>
                      <div
                        className={`flex gap-3 rounded-lg border px-3 py-2 ${s.phase1.attributeCorrect ? "border-gray-200 bg-white" : "border-red-200 bg-red-50/40"}`}
                      >
                        {passFailIcon(s.phase1.attributeCorrect)}
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-xs font-semibold uppercase tracking-wide ${s.phase1.attributeCorrect ? "text-emerald-600" : "text-red-600"}`}
                          >
                            Attribute
                          </div>
                          <p className="text-sm text-gray-700">{s.phase1.explanation.attribute}</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Phase 2 */}
                  <section className={phaseCard}>
                    <div className="mb-4 inline-flex rounded-full bg-[#eefcfb] px-3 py-1 text-sm font-semibold text-[#0f766e] ring-1 ring-[#cceeea]">
                      Phase 2 · {s.phase2.raw}/10 ({Math.round(s.phase2.percentage)}%)
                    </div>
                    <div className={`mb-4 grid gap-2 ${siteIdx < 2 ? "md:grid-cols-[1.6fr_1fr]" : "md:grid-cols-1"}`}>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                        <div className="mb-1 font-semibold text-gray-800">Site {siteIdx + 1} info</div>
                        <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap text-gray-700">
                          <span className="font-medium text-gray-800">{req.name}</span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-flex">{attributeRowIcon("Mobility")}</span>
                            <span>Mobility: {req.attributes.Mobility.min}–{req.attributes.Mobility.max}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-flex">{attributeRowIcon("Agility")}</span>
                            <span>Agility: {req.attributes.Agility.min}–{req.attributes.Agility.max}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-flex">{attributeRowIcon("Size")}</span>
                            <span>Size: {req.attributes.Size.min}–{req.attributes.Size.max}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span>Desired:</span>
                            <span
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                              style={{ backgroundColor: traitChipBg(req.desired_trait), color: traitColor(req.desired_trait) }}
                            >
                              {traitIcon(req.desired_trait, "h-3.5 w-3.5")}
                            </span>
                            <span>{req.desired_trait}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span>Undesired:</span>
                            <span
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                              style={{ backgroundColor: traitChipBg(req.undesired_trait), color: traitColor(req.undesired_trait) }}
                            >
                              {traitIcon(req.undesired_trait, "h-3.5 w-3.5")}
                            </span>
                            <span>{req.undesired_trait}</span>
                          </span>
                        </div>
                      </div>
                      {siteIdx < 2 ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs">
                          <div className="font-semibold text-amber-800">Site {siteIdx + 2} insight</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-amber-900">
                            {entry.revealedChar ? (
                              entry.revealedChar.type === "trait" ? (
                                <>
                                  <span>Desired:</span>
                                  <span
                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                                    style={{
                                      backgroundColor: traitChipBg(String(entry.revealedChar.value)),
                                      color: traitColor(String(entry.revealedChar.value)),
                                    }}
                                  >
                                    {traitIcon(String(entry.revealedChar.value), "h-3.5 w-3.5")}
                                  </span>
                                  <span>{String(entry.revealedChar.value)}</span>
                                </>
                              ) : (
                                <>
                                  <span className="inline-flex">{attributeRowIcon(entry.revealedChar.name as (typeof ATTR_NAMES)[number])}</span>
                                  <span>
                                    {entry.revealedChar.name}: {(entry.revealedChar.value as { min: number; max: number }).min}–
                                    {(entry.revealedChar.value as { min: number; max: number }).max}
                                  </span>
                                </>
                              )
                            ) : (
                              <span>No additional insight shown for this site.</span>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
                      {s.phase2.decisions.map((d) => {
                        const wrong = d.playerChoice !== d.correctChoice
                        const ex = s.phase2.explanation.incorrect.find((i) => i.id === d.microbeId)
                        const pm = entry.catPoolMicrobes.find((x) => x.id === d.microbeId) ?? pool.find((x) => x.id === d.microbeId) ?? null
                        const rewrittenReason = ex?.reason ?? null
                        return (
                          <div
                            key={d.microbeId}
                            className={`rounded-lg border p-2 text-[11px] shadow-sm ${wrong ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}
                          >
                            <div className="font-semibold leading-tight text-gray-900 line-clamp-2">{resolveName(d.microbeId)}</div>
                            {pm ? (
                              <div className="mt-1 space-y-0.5 text-[10px] text-gray-700">
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex">{attributeKeyIcon("Mobility")}</span>
                                  <span>{pm.Mobility}</span>
                                  <span className="inline-flex">{attributeKeyIcon("Agility")}</span>
                                  <span>{pm.Agility}</span>
                                  <span className="inline-flex">{attributeKeyIcon("Size")}</span>
                                  <span>{pm.Size}</span>
                                  <TraitBadgeChip trait={pm.trait} />
                                </div>
                              </div>
                            ) : null}
                            <div className="mt-1 text-gray-600">
                              You: <span className="font-medium">{phase2ChoiceLabel(d.playerChoice, siteIdx + 1)}</span>
                            </div>
                            <div className="text-gray-600">
                              Correct: <span className="font-medium">{phase2ChoiceLabel(d.correctChoice, siteIdx + 1)}</span>
                            </div>
                            {wrong && rewrittenReason ? <div className="mt-1 text-red-600">{rewrittenReason}</div> : null}
                          </div>
                        )
                      })}
                    </div>
                  </section>

                  {/* Phase 0 */}
                  {s.phase0 ? (
                    <section className={phaseCard}>
                      <div className="mb-4 inline-flex rounded-full bg-[#eefcfb] px-3 py-1 text-sm font-semibold text-[#0f766e] ring-1 ring-[#cceeea]">
                        Phase 0 · {s.phase0.raw}/{s.phase0.n} ({Math.round(s.phase0.percentage)}%)
                      </div>
                      <ul className="space-y-2">
                        {s.phase0.decisions.map((d) => {
                          const p0m = pool.find((x) => x.id === d.microbeId) ?? null
                          return (
                          <li
                            key={d.microbeId}
                            className={`rounded-lg border p-3 text-sm shadow-sm ${d.correct ? "border-gray-200 bg-white" : "border-red-300 bg-red-50"}`}
                          >
                            {p0m ? (
                              <div className="mb-2 flex justify-center [&>svg]:h-12 [&>svg]:w-12">{MicrobeSvgFor(p0m, pool)}</div>
                            ) : null}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-gray-900">{d.microbeName}</span>
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${phase0ClassificationBadge(d.classification)}`}>
                                {d.classification}
                              </span>
                              <span className="text-gray-600">
                                Your choice: <span className="font-medium">{d.playerChoice}</span>
                              </span>
                              <span className={`font-semibold ${d.correct ? "text-emerald-600" : "text-red-600"}`}>
                                {d.correct ? "Correct" : "Incorrect"}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-600">{d.reason}</p>
                          </li>
                          )
                        })}
                      </ul>
                    </section>
                  ) : null}

                  {/* Phase 3 */}
                  <section className={phaseCard}>
                    <div className="mb-4 inline-flex rounded-full bg-[#eefcfb] px-3 py-1 text-sm font-semibold text-[#0f766e] ring-1 ring-[#cceeea]">
                      Phase 3 ({Math.round(s.phase3.percentage)}%)
                    </div>
                    <p className="mb-4 text-sm text-gray-600">
                      Phase 3 scores how well you built your prospect pool. Each round you lose points for picking a worse option when a
                      better one was available: −2 for picking neutral over optimal, −3 for picking negative. Without an optimal pick, −1 for
                      a worse neutral, −2 for negative. A further penalty applies if your pool can't reach the original maximum treatment
                      score.
                    </p>
                    <div className="mb-4 grid gap-3 sm:grid-cols-2">
                      {s.phase3.roundResults.map((rr, rrIdx) => {
                        const chooseSet = entry.prospectChooseSets[rrIdx]
                        const bestNeutral = chooseSet
                          ? chooseSet.candidates
                              .filter((c) => c.classification === "neutral" && c.neutral_score !== null)
                              .sort((a, b) => (b.neutral_score ?? -Infinity) - (a.neutral_score ?? -Infinity))[0]
                          : null
                        const aiLine = phase3RoundFallbackFeedback(rr)
                        return (
                          <div key={`r-${rr.round}`} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                            <div className="mb-2 font-bold text-gray-900">Round {rr.round}</div>
                            <div className="grid gap-2">
                              {(chooseSet?.candidates ?? []).map((cand) => {
                                const picked = rr.playerPickId === cand.microbe.id
                                const isOptimal = cand.classification === "optimal"
                                const isBestNeutral = !rr.optimalId && bestNeutral?.microbe.id === cand.microbe.id
                                const cardClass = isOptimal
                                  ? "border-emerald-500 bg-emerald-50"
                                  : isBestNeutral
                                    ? "border-amber-400 bg-amber-50"
                                    : "border-gray-200 bg-white"
                                return (
                                  <div key={`${rr.round}-${cand.microbe.id}`} className={`rounded-md border px-2 py-2 ${cardClass} ${picked ? "border-blue-400 ring-1 ring-blue-300" : ""}`}>
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="truncate text-xs font-bold text-gray-900">{cand.microbe.name}</p>
                                      <div className="flex items-center gap-1">
                                        {picked ? <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">YOUR PICK</span> : null}
                                        <span
                                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                            cand.classification === "optimal"
                                              ? "bg-emerald-200 text-emerald-800"
                                              : cand.classification === "neutral"
                                                ? "bg-amber-200 text-amber-800"
                                                : "bg-red-200 text-red-800"
                                          }`}
                                        >
                                          {cand.classification}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-600">
                                      <span>M: {cand.microbe.Mobility}</span>
                                      <span>A: {cand.microbe.Agility}</span>
                                      <span>S: {cand.microbe.Size}</span>
                                      <TraitBadgeChip trait={cand.microbe.trait} chipClassName="h-5 w-5" />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <p className="text-xs text-gray-700">Round {rr.round}: {aiLine}</p>
                              {rr.deduction > 0 ? (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">-{rr.deduction}</span>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm">
                      <span className="font-semibold text-gray-900">Pool quality: </span>
                      Original pool max score: <span className="tabular-nums font-medium">{s.phase3.originalMaxScore}</span>
                      {" · "}
                      Your pool max score: <span className="tabular-nums font-medium">{s.phase3.playerPoolMaxScore}</span>
                      {" · "}
                      Penalty:{" "}
                      <span className="tabular-nums font-medium">{Math.round(s.phase3.poolQualityPenalty * 100) / 100}</span>
                    </div>
                  </section>

                  {/* Phase 4 — SimulatorResult treatment layout */}
                  <section className={sectionCard}>
                    <div className="mb-4 inline-flex rounded-full bg-[#eefcfb] px-3 py-1 text-sm font-semibold text-[#0f766e] ring-1 ring-[#cceeea]">
                      Phase 4 · Treatment · {s.phase4.score}/100 ({Math.round(s.phase4.percentage)}%)
                    </div>
                    <div
                      className="flex flex-col gap-6 lg:grid lg:items-stretch lg:gap-8"
                      style={{ gridTemplateColumns: "65% 35%" }}
                    >
                      <div className="min-w-0">
                        <h2 className={`mb-4 ${accentHeading}`}>Site &amp; Your Selection</h2>
                        <p className="mb-3 text-sm text-gray-600">
                          <span className="font-medium text-[#1a202c]">{req.name}</span>
                        </p>
                        <div className="mb-6 flex flex-wrap gap-2">
                          <span className="inline-flex rounded-full border border-[#cceeea] bg-[#eefcfb] px-2.5 py-1 text-xs font-medium text-[#1a202c]">
                            Mobility {req.attributes.Mobility.min}–{req.attributes.Mobility.max}
                          </span>
                          <span className="inline-flex rounded-full border border-[#cceeea] bg-[#eefcfb] px-2.5 py-1 text-xs font-medium text-[#1a202c]">
                            Agility {req.attributes.Agility.min}–{req.attributes.Agility.max}
                          </span>
                          <span className="inline-flex rounded-full border border-[#cceeea] bg-[#eefcfb] px-2.5 py-1 text-xs font-medium text-[#1a202c]">
                            Size {req.attributes.Size.min}–{req.attributes.Size.max}
                          </span>
                          <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                            Desired: {req.desired_trait}
                          </span>
                          <span className="inline-flex rounded-full border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800">
                            Undesired: {req.undesired_trait}
                          </span>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                          {s.phase4.selectedMicrobes.map((raw) => {
                            const m = raw as Microbe
                            const cat = categorizeMicrobeForResults(m, req)
                            const badgeTone =
                              cat.category === "positive"
                                ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                                : cat.category === "negative"
                                  ? "bg-red-100 text-red-800 ring-1 ring-red-200"
                                  : "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
                            const categoryLabel =
                              cat.category === "positive"
                                ? "Positive"
                                : cat.category === "negative"
                                  ? "Negative"
                                  : "Neutral"
                            const inv = getInviableAttributes(m, req)
                            return (
                              <div
                                key={m.id ?? microbeResultKey(m)}
                                className="flex min-w-[180px] flex-1 basis-[calc(33.333%-0.5rem)] flex-col rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm"
                              >
                                <p className="line-clamp-2 text-base font-bold text-[#1a202c]">{m.name ?? "Microbe"}</p>
                                <div className="my-3 flex justify-center [&>svg]:h-16 [&>svg]:w-16">{MicrobeSvgFor(m, pool)}</div>
                                <SlotAttributeRow Mobility={m.Mobility} Agility={m.Agility} Size={m.Size} inviableAttributes={inv} />
                                <div className="mt-3 flex w-full flex-wrap items-center justify-between gap-2">
                                  <TraitBadgeChip trait={m.trait} chipClassName="h-7 w-7" />
                                  <div className="flex items-center gap-1.5">
                                    {inv.length > 0 ? (
                                      <Tooltip text="An inviable microbe cannot mathematically contribute to a valid average for one or more attributes, regardless of what other microbes are selected.">
                                        <span className="inline-flex h-[22px] w-[22px] shrink-0 cursor-default items-center justify-center rounded-full bg-amber-100 text-[13px] text-amber-500">
                                          ⚠
                                        </span>
                                      </Tooltip>
                                    ) : null}
                                    <span
                                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeTone}`}
                                    >
                                      {categoryLabel}
                                    </span>
                                  </div>
                                </div>
                                <p className="mt-2 text-[13px] leading-snug text-gray-500">{cat.reason}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="flex h-full min-h-0 min-w-0 flex-col">
                        <h2 className={`mb-4 shrink-0 ${accentHeading}`}>Condition Checklist</h2>
                        <ul className="flex min-h-0 flex-1 flex-col gap-1 rounded-xl border border-[#e2e8f0] bg-[#f8fffe] p-3">
                          {checklistRows.map((row) => (
                            <li
                              key={row.label}
                              className={`flex min-h-0 flex-1 flex-col gap-0.5 rounded-lg border px-2 py-1 sm:flex-row sm:items-center sm:gap-2 ${row.pass ? "border-[#e2e8f0] border-l-4 border-l-[#4ECDC4] bg-white" : "border-red-200 bg-red-50/50"}`}
                            >
                              <span className="shrink-0 leading-none" aria-hidden>
                                {row.pass ? (
                                  <svg className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 16 16" fill="currentColor">
                                    <circle cx="8" cy="8" r="8" className="text-emerald-100" fill="currentColor" opacity="0.2" />
                                    <path
                                      d="M5 8l2 2 4-4"
                                      stroke="#059669"
                                      strokeWidth="1.5"
                                      fill="none"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                ) : (
                                  <svg className="h-4 w-4 shrink-0 text-red-600" viewBox="0 0 16 16" fill="currentColor">
                                    <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.15" />
                                    <path
                                      d="M5 5l6 6M11 5l-6 6"
                                      stroke="#dc2626"
                                      strokeWidth="1.5"
                                      fill="none"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                )}
                              </span>
                              <span
                                className={`shrink-0 text-sm font-medium ${row.pass ? "text-emerald-600" : "text-red-600"}`}
                              >
                                {row.label}
                              </span>
                              {"detail" in row && row.detail ? (
                                <span
                                  className={`whitespace-nowrap text-[11px] sm:ml-auto ${row.pass ? "text-emerald-700" : "text-red-700"}`}
                                >
                                  {(() => {
                                    const parts = row.detail.split("· Actual: ")
                                    if (parts.length === 2) {
                                      return (
                                        <>
                                          {parts[0]}· Actual: <span className="font-bold">{parts[1]}</span>
                                        </>
                                      )
                                    }
                                    return row.detail
                                  })()}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h2 className={`mb-6 ${accentHeading}`}>🏆 Optimal Combination</h2>
                    {playerFoundOptimal ? (
                      <p className="mb-4 text-base font-semibold text-emerald-600">🎉 You found the optimal combination!</p>
                    ) : null}
                    <div className={`mx-auto ${sectionCard}`}>
                      <div className="mt-6 grid w-full gap-4 [grid-template-columns:repeat(5,1fr)]">
                        {Array.from({ length: GRID_SLOTS }, (__, idx) => {
                          const m = pool[idx]
                          if (!m) {
                            return (
                              <div
                                key={`result-empty-game-${siteIdx}-${idx}`}
                                className="min-h-[140px] w-full min-w-[160px] rounded-xl bg-gray-50"
                                aria-hidden
                              />
                            )
                          }
                          const isOptimalMicrobe = optimalMemberKeys.has(microbeResultKey(m))
                          const isPlayerSelected = selectedKeys.has(microbeResultKey(m))
                          return (
                            <div
                              key={m.id}
                              className={`relative flex min-h-[140px] w-full min-w-[160px] flex-col overflow-visible rounded-xl border-2 bg-white p-2 shadow-md ${
                                isOptimalMicrobe
                                  ? "border-[#16a34a] bg-[#f0fdf4]"
                                  : isPlayerSelected
                                    ? "border-[#e2e8f0] border-l-[3px] border-l-[#2563eb] opacity-50"
                                    : "border-[#e2e8f0] opacity-50"
                              }`}
                            >
                              {isOptimalMicrobe && isPlayerSelected ? (
                                <>
                                  <span className={`${badgeBase} left-1/4 -translate-x-1/2 bg-[#16a34a]`}>OPTIMAL</span>
                                  <span className={`${badgeBase} left-3/4 -translate-x-1/2 bg-[#2563eb]`}>YOUR PICK</span>
                                </>
                              ) : isOptimalMicrobe ? (
                                <span className={`${badgeBase} left-1/2 -translate-x-1/2 bg-[#16a34a]`}>OPTIMAL</span>
                              ) : isPlayerSelected ? (
                                <span className={`${badgeBase} left-1/2 -translate-x-1/2 bg-[#2563eb]`}>YOUR PICK</span>
                              ) : null}
                              <p className="mb-1 line-clamp-2 w-full text-center text-[13px] font-bold text-gray-800">{m.name}</p>
                              <div className="mb-1 flex shrink-0 justify-center [&>svg]:h-14 [&>svg]:w-14">{MicrobeSvgFor(m, pool)}</div>
                              <div className="mt-auto flex w-full items-center justify-between gap-1 px-0.5">
                                <MicrobeAttributeRow
                                  Mobility={m.Mobility}
                                  Agility={m.Agility}
                                  Size={m.Size}
                                  inviableAttributes={getInviableAttributes(m, req)}
                                  highlightInviable
                                />
                                <TraitBadgeChip trait={m.trait} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <p
                        className={`mt-4 border-t border-[#e2e8f0] pt-4 text-lg tabular-nums ${gameResultsOptimalScoreLineClass(s.phase4.optimalScore)}`}
                      >
                        Optimal score: {s.phase4.optimalScore}/100
                      </p>
                    </div>
                  </section>
                </div>
              </details>
            )
          })}
        </div>

        {siteDetail.some((e) => e.site.phase4.optimalScore < 100) ? (
          <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-gray-500">
            Note: perfect scores (100) are not always achievable. The max possible score shown reflects the best achievable result for
            each pool.
          </p>
        ) : null}
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
    phase3SvgMap: null,
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
  const [treatmentPoolsBySite, setTreatmentPoolsBySite] = useState<Microbe[][]>([])
  const [p1SelectionsBySite, setP1SelectionsBySite] = useState<GSelectionItem[][]>([])
  const [taggedForSite2, setTaggedForSite2] = useState<Microbe[]>([])
  const [taggedForSite3, setTaggedForSite3] = useState<Microbe[]>([])

  const remainRef = useRef(timeRemaining)
  useEffect(() => {
    remainRef.current = timeRemaining
  }, [timeRemaining])

  const siteRemainAtEnterRef = useRef<(number | null)[]>([null, null, null])

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
      setTreatmentPoolsBySite([])
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

  const handleSkipToResults = useCallback(async () => {
    if (pickingChains) return
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
        window.alert("Could not build a scenario chain — try again.")
        setPickingChains(false)
        return
      }

      const { finished, pools, p1Picks } = buildDevFinishedThreeSites(chain)
      setTaggedForSite2([])
      setTaggedForSite3([])
      setGameCfg(chain)
      setFinishedSites(finished)
      setTreatmentPoolsBySite(pools)
      setP1SelectionsBySite(p1Picks)
      setWip(null)
      setStep("results")
    } catch (e) {
      console.error(e)
      window.alert("Failed to load game data.")
    } finally {
      setPickingChains(false)
    }
  }, [pickingChains, scenariosMeta])

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
      const treatmentPoolSnap = [...wc.phase3Pool]

      if (wc.siteNumber === 1) {
        siteRemainAtEnterRef.current[1] = remainRef.current
        setFinishedSites((prev) => [...prev, sealed])
        setTreatmentPoolsBySite((prev) => [...prev, treatmentPoolSnap])
        setP1SelectionsBySite((prev) => [...prev, wc.phase1Selections])
        setWip(newSiteWip(2, g))
        setStep(taggedForSite2.length > 0 ? "s2_phase0" : "s2_phase1")
        return
      }

      if (wc.siteNumber === 2) {
        siteRemainAtEnterRef.current[2] = remainRef.current
        setFinishedSites((prev) => [...prev, sealed])
        setTreatmentPoolsBySite((prev) => [...prev, treatmentPoolSnap])
        setP1SelectionsBySite((prev) => [...prev, wc.phase1Selections])
        setWip(newSiteWip(3, g))
        setStep(taggedForSite3.length > 0 ? "s3_phase0" : "s3_phase1")
        return
      }

      setFinishedSites((prev) => [...prev, sealed])
      setTreatmentPoolsBySite((prev) => [...prev, treatmentPoolSnap])
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
          treatmentPool: treatmentPoolsBySite[ix] ?? [],
          catPoolMicrobes: ix === 0 ? cfg.catPool12.microbes : ix === 1 ? cfg.catPool23.microbes : [],
          prospectChooseSets: ix === 0 ? cfg.prospectA.choose_sets : ix === 1 ? cfg.prospectB.choose_sets : cfg.prospectC.choose_sets,
          revealedChar: ix === 0 ? cfg.catPool12.revealed_characteristic : ix === 1 ? cfg.catPool23.revealed_characteristic : null,
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
          {DEV_MODE ? (
            <button
              type="button"
              disabled={pickingChains}
              onClick={() => void handleSkipToResults()}
              className="mt-6 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-orange-600 disabled:cursor-wait disabled:opacity-70"
            >
              → Skip to Results
            </button>
          ) : null}
        </div>
      ) : null}

      {cfg && w ? (
        <>
          {step === "s1_phase1" ? (
            <GamePhase1ProfilingPanel
              key="s1-p1"
              stickySiteNumber={w.siteNumber}
              traits={traitsList}
              scenario={cfg.scenarios[0]!}
              attributesListForKey={attrListForKey}
              scenariosFileTraits={traitsList}
              onComplete={(score: Phase1Score, picks: GSelectionItem[]) => {
                setWip((cur) => (cur ? { ...cur, phase1Result: score, phase1Selections: picks } : cur))
                setStep("s1_phase2")
              }}
            />
          ) : null}

          {step === "s1_phase2" ? (
            <GamePhase2Panel
              key={`s12-${cfg.catPool12.categorization_id}`}
              pool={cfg.catPool12}
              scenario={cfg.scenarios[w.siteNumber - 1]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
              traitListFull={traitsList}
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
              scenario={cfg.scenarios[0]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
              scenariosFileTraits={traitsList}
              onComplete={(score, pool, svgMap) => {
                setWip((cur) =>
                  cur ? { ...cur, phase3Result: score, phase3Pool: pool, phase3SvgMap: svgMap } : cur,
                )
                setStep("s1_phase4")
              }}
            />
          ) : null}

          {step === "s1_phase4" && w.phase3Pool.length && w.phase3SvgMap ? (
            <GamePhase4TreatmentPanel
              key="s1-p4"
              builtPool={w.phase3Pool}
              svgMap={w.phase3SvgMap}
              scenario={cfg.scenarios[0]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
              scenariosFileTraits={traitsList}
              onComplete={resolvePhase4Complete}
            />
          ) : null}

          {step === "s2_phase0" && taggedForSite2.length > 0 ? (
            <GamePhase0Panel
              key="s2-p0"
              taggedMicrobes={taggedForSite2}
              scenario={cfg.scenarios[1]!}
              displaySiteNum={w.siteNumber}
              blobPalettePool={cfg.catPool12.microbes}
              attributesListForKey={attrListForKey}
              traitListFull={traitsList}
              onComplete={(p0) => {
                setWip((cur) => (cur ? { ...cur, phase0Result: p0 } : cur))
                setStep("s2_phase1")
              }}
            />
          ) : null}

          {step === "s2_phase1" ? (
            <GamePhase1ProfilingPanel
              key="s2-p1"
              stickySiteNumber={w.siteNumber}
              traits={traitsList}
              scenario={cfg.scenarios[1]!}
              attributesListForKey={attrListForKey}
              scenariosFileTraits={traitsList}
              onComplete={(score: Phase1Score, picks: GSelectionItem[]) => {
                setWip((cur) => (cur ? { ...cur, phase1Result: score, phase1Selections: picks } : cur))
                setStep("s2_phase2")
              }}
            />
          ) : null}

          {step === "s2_phase2" ? (
            <GamePhase2Panel
              key={`s23-${cfg.catPool23.categorization_id}`}
              pool={cfg.catPool23}
              scenario={cfg.scenarios[w.siteNumber - 1]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
              traitListFull={traitsList}
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
              scenario={cfg.scenarios[1]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
              scenariosFileTraits={traitsList}
              onComplete={(score, pool, svgMap) => {
                setWip((cur) =>
                  cur ? { ...cur, phase3Result: score, phase3Pool: pool, phase3SvgMap: svgMap } : cur,
                )
                setStep("s2_phase4")
              }}
            />
          ) : null}

          {step === "s2_phase4" && w.phase3Pool.length && w.phase3SvgMap ? (
            <GamePhase4TreatmentPanel
              key="s2-p4"
              builtPool={w.phase3Pool}
              svgMap={w.phase3SvgMap}
              scenario={cfg.scenarios[1]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
              scenariosFileTraits={traitsList}
              onComplete={resolvePhase4Complete}
            />
          ) : null}

          {step === "s3_phase0" && taggedForSite3.length > 0 ? (
            <GamePhase0Panel
              key="s3-p0"
              taggedMicrobes={taggedForSite3}
              scenario={cfg.scenarios[2]!}
              displaySiteNum={w.siteNumber}
              blobPalettePool={cfg.catPool23.microbes}
              attributesListForKey={attrListForKey}
              traitListFull={traitsList}
              onComplete={(p0) => {
                setWip((cur) => (cur ? { ...cur, phase0Result: p0 } : cur))
                setStep("s3_phase1")
              }}
            />
          ) : null}

          {step === "s3_phase1" ? (
            <GamePhase1ProfilingPanel
              key="s3-p1"
              stickySiteNumber={w.siteNumber}
              traits={traitsList}
              scenario={cfg.scenarios[2]!}
              attributesListForKey={attrListForKey}
              scenariosFileTraits={traitsList}
              onComplete={(score: Phase1Score, picks: GSelectionItem[]) => {
                setWip((cur) => (cur ? { ...cur, phase1Result: score, phase1Selections: picks } : cur))
                setStep("s3_phase2")
              }}
            />
          ) : null}

          {step === "s3_phase2" ? (
            <GamePhase2Panel
              key={`s3-${cfg.catPoolSite3.categorization_id}`}
              pool={cfg.catPoolSite3}
              scenario={cfg.scenarios[w.siteNumber - 1]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
              traitListFull={traitsList}
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
              scenario={cfg.scenarios[2]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
              scenariosFileTraits={traitsList}
              onComplete={(score, pool, svgMap) => {
                setWip((cur) =>
                  cur ? { ...cur, phase3Result: score, phase3Pool: pool, phase3SvgMap: svgMap } : cur,
                )
                setStep("s3_phase4")
              }}
            />
          ) : null}

          {step === "s3_phase4" && w.phase3Pool.length && w.phase3SvgMap ? (
            <GamePhase4TreatmentPanel
              key="s3-p4"
              builtPool={w.phase3Pool}
              svgMap={w.phase3SvgMap}
              scenario={cfg.scenarios[2]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
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
