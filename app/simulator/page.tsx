"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import Link from "next/link"
import {
  Activity,
  Gauge,
  Maximize2,
  Target,
  Trophy,
  XOctagon,
  Zap,
  Settings,
  LogOut,
  Plus,
  Minus,
  X,
  HelpCircle,
  Star,
  ChevronUp,
  ChevronDown,
} from "lucide-react"

// --- inlined from app/simulator/types.ts ---
type Microbe = {
  id: string
  name: string
  Mobility: number
  Agility: number
  Size: number
  trait: string
}

type Pool = {
  pool_id: string
  max_score: number
  difficulty: string
  microbes: Microbe[]
  best_combinations: string[][]
}

type ScenarioData = {
  [scenarioName: string]: {
    easy: Pool[]
    medium: Pool[]
    hard: Pool[]
    very_hard: Pool[]
  }
}

type GameResult = {
  selectedMicrobes: Microbe[]
  optimalCombos: Microbe[][]
  playerScore: number
  maxScore: number
  scenarioName: string
  conditionResults: [boolean, boolean, boolean, boolean, boolean]
  timeSpent: number
}

type ScenarioAttributeRanges = {
  Mobility: { min: number; max: number }
  Agility: { min: number; max: number }
  Size: { min: number; max: number }
}

type ScenarioRequirements = {
  id: number
  name: string
  difficulty: string
  attributes: ScenarioAttributeRanges
  desired_trait: string
  undesired_trait: string
}

type ScenariosFile = {
  traits: string[]
  attributes: string[]
  scenarios: ScenarioRequirements[]
}

// --- inlined from lib/simulator-scoring.ts ---
type ScoreComboResult = {
  score: number
  conditionResults: [boolean, boolean, boolean, boolean, boolean]
  means: { mobility: number; agility: number; size: number }
}

function scoreCombo(trio: Microbe[], req: ScenarioRequirements): ScoreComboResult {
  if (trio.length !== 3) {
    return {
      score: 0,
      conditionResults: [false, false, false, false, false],
      means: { mobility: 0, agility: 0, size: 0 },
    }
  }

  const attrs = req.attributes
  const means = {
    mobility: trio.reduce((s, m) => s + m.Mobility, 0) / 3,
    agility: trio.reduce((s, m) => s + m.Agility, 0) / 3,
    size: trio.reduce((s, m) => s + m.Size, 0) / 3,
  }

  const mobilityOk =
    means.mobility >= attrs.Mobility.min && means.mobility <= attrs.Mobility.max
  const agilityOk =
    means.agility >= attrs.Agility.min && means.agility <= attrs.Agility.max
  const sizeOk = means.size >= attrs.Size.min && means.size <= attrs.Size.max
  const desiredOk = trio.some((m) => m.trait === req.desired_trait)
  const undesiredOk = !trio.some((m) => m.trait === req.undesired_trait)

  const conditionResults: [boolean, boolean, boolean, boolean, boolean] = [
    mobilityOk,
    agilityOk,
    sizeOk,
    desiredOk,
    undesiredOk,
  ]

  let score = 100
  if (!mobilityOk) score -= 20
  if (!agilityOk) score -= 20
  if (!sizeOk) score -= 20
  if (!desiredOk) score -= 20
  if (!undesiredOk) score -= 20

  return {
    score: Math.max(0, score),
    conditionResults,
    means,
  }
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
  <svg viewBox="0 0 80 80" className="w-12 h-12">
    <ellipse cx="40" cy="40" rx="30" ry="25" fill={color} />
    <circle cx="30" cy="35" r="4" fill="white" opacity="0.6" />
    <path d="M15 40 Q5 35 8 25" stroke={color} strokeWidth="3" fill="none" />
    <path d="M65 40 Q75 35 72 25" stroke={color} strokeWidth="3" fill="none" />
  </svg>
)

const MicrobeBlob2 = ({ color = "#4ECDC4" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="w-12 h-12">
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
  <svg viewBox="0 0 80 80" className="w-12 h-12">
    <circle cx="40" cy="40" r="20" fill={color} />
    <circle cx="25" cy="25" r="8" fill={color} />
    <circle cx="55" cy="25" r="6" fill={color} />
    <circle cx="55" cy="55" r="7" fill={color} />
    <circle cx="25" cy="55" r="5" fill={color} />
  </svg>
)

const MicrobeBlob4 = ({ color = "#95E1D3" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="w-12 h-12">
    <ellipse cx="40" cy="45" rx="25" ry="20" fill={color} />
    <path d="M20 30 Q15 15 25 10" stroke={color} strokeWidth="3" fill="none" />
    <path d="M60 30 Q65 15 55 10" stroke={color} strokeWidth="3" fill="none" />
    <circle cx="35" cy="40" r="3" fill="white" opacity="0.6" />
  </svg>
)

const MicrobeBlob5 = ({ color = "#F38181" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="w-12 h-12">
    <path d="M40 15 L55 30 L55 50 L40 65 L25 50 L25 30 Z" fill={color} />
    <circle cx="40" cy="40" r="8" fill="white" opacity="0.3" />
    <path d="M40 15 L40 5" stroke={color} strokeWidth="2" />
    <path d="M55 30 L65 25" stroke={color} strokeWidth="2" />
    <path d="M25 30 L15 25" stroke={color} strokeWidth="2" />
  </svg>
)

const MicrobeBlob6 = ({ color = "#AA96DA" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="w-12 h-12">
    <ellipse cx="40" cy="40" rx="28" ry="18" fill={color} />
    <path d="M12 40 Q5 40 8 50" stroke={color} strokeWidth="3" fill="none" />
    <path d="M68 40 Q75 40 72 50" stroke={color} strokeWidth="3" fill="none" />
    <circle cx="30" cy="38" r="4" fill="white" opacity="0.5" />
    <circle cx="50" cy="38" r="4" fill="white" opacity="0.5" />
  </svg>
)

const MicrobeBlob7 = ({ color = "#FCBAD3" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="w-12 h-12">
    <circle cx="40" cy="40" r="22" fill={color} />
    <circle cx="40" cy="40" r="12" fill="white" opacity="0.2" />
    <path
      d="M40 18 L40 8 M45 10 L40 8 L35 10"
      stroke={color}
      strokeWidth="2"
      fill="none"
    />
  </svg>
)

const MicrobeBlob8 = ({ color = "#A8D8EA" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="w-12 h-12">
    <path d="M25 40 Q25 20 40 20 Q55 20 55 40 Q55 60 40 60 Q25 60 25 40" fill={color} />
    <ellipse cx="40" cy="40" rx="8" ry="12" fill="white" opacity="0.3" />
    <circle cx="18" cy="35" r="5" fill={color} />
    <circle cx="62" cy="35" r="5" fill={color} />
  </svg>
)

const MicrobeBlob9 = ({ color = "#C3EDC0" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="w-12 h-12">
    <ellipse cx="40" cy="42" rx="22" ry="18" fill={color} />
    <path d="M30 24 Q28 12 35 8" stroke={color} strokeWidth="3" fill="none" />
    <path d="M50 24 Q52 12 45 8" stroke={color} strokeWidth="3" fill="none" />
    <path d="M40 60 L40 72" stroke={color} strokeWidth="3" fill="none" />
  </svg>
)

const MicrobeBlob10 = ({ color = "#FFD93D" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="w-12 h-12">
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

function hashHue(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h) % 360
}

function traitColor(trait: string) {
  return `hsl(${hashHue(trait)} 52% 40%)`
}

function traitAbbrev(trait: string) {
  const parts = trait.split(/[\s-]+/).filter(Boolean)
  if (parts.length >= 2)
    return (parts[0]![0] + parts[1]![0]).slice(0, 2).toUpperCase()
  return trait.slice(0, 2).toUpperCase()
}

function pickRandomScenarioPool(data: ScenarioData): { scenarioName: string; pool: Pool } {
  const scenarioNames = Object.keys(data).filter(Boolean)
  if (scenarioNames.length === 0) {
    throw new Error("No scenarios in pools data")
  }
  const scenarioName = scenarioNames[Math.floor(Math.random() * scenarioNames.length)]!

  const bucket = data[scenarioName]!
  const pools = [...bucket.easy, ...bucket.medium, ...bucket.hard, ...bucket.very_hard]
  if (!pools.length) {
    throw new Error(`No pools for scenario «${scenarioName}»`)
  }
  const pool = pools[Math.floor(Math.random() * pools.length)]!
  return { scenarioName, pool }
}

function resolveOptimalCombos(pool: Pool): Microbe[][] {
  const byId = Object.fromEntries(pool.microbes.map((m) => [m.id, m]))
  return pool.best_combinations
    .map((ids) => ids.map((id) => byId[id]).filter(Boolean) as Microbe[])
    .filter((c) => c.length === 3)
}

/** Match pools.json scenario bucket key (`Coral Reef Delta`, etc.) to an entry by `name`. */
function lookupScenario(scenariosFile: ScenariosFile, poolScenarioKey: string): ScenarioRequirements | null {
  return scenariosFile.scenarios.find((s) => s.name === poolScenarioKey) ?? null
}

function attributeKeyIcon(attribute: string) {
  switch (attribute) {
    case "Mobility":
      return (
        <svg className="h-3 w-3 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="1" width="4" height="4" />
          <rect x="6" y="1" width="4" height="4" />
          <rect x="11" y="1" width="4" height="4" />
          <rect x="1" y="6" width="4" height="4" />
          <rect x="6" y="6" width="4" height="4" />
        </svg>
      )
    case "Agility":
      return (
        <svg className="h-3 w-3 text-yellow-500" viewBox="0 0 16 16" fill="currentColor">
          <path d="M9 1L4 9h4l-1 6 5-8H8l1-6z" />
        </svg>
      )
    case "Size":
      return (
        <svg className="h-3 w-3 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1 15L1 1L15 15H1Z" opacity="0.6" />
        </svg>
      )
    default:
      return <span className="inline-block h-3 w-3 rounded-sm bg-gray-500" aria-hidden />
  }
}

function Tooltip({ children, text }: { children: ReactNode; text: string }) {
  return (
    <div className="relative group">
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
        {text}
      </div>
    </div>
  )
}

/** Pool index order equals grid placement (always 10 cells). */
const GRID_MICROBE_SLOTS = 10

function MicrobeAttributeRow({
  Mobility,
  Agility,
  Size,
}: {
  Mobility: number
  Agility: number
  Size: number
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs leading-none">
      <Tooltip text="Mobility">
        <div className="flex items-center gap-0.5">
          <svg className="h-3 w-3 shrink-0 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
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
        </div>
      </Tooltip>
      <Tooltip text="Agility">
        <div className="flex items-center gap-0.5">
          <svg className="h-3 w-3 shrink-0 text-yellow-500" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9 1L4 9h4l-1 6 5-8H8l1-6z" />
          </svg>
          <span className="tabular-nums leading-none text-gray-700">{Agility}</span>
        </div>
      </Tooltip>
      <Tooltip text="Size">
        <div className="flex items-center gap-0.5">
          <svg className="h-3 w-3 shrink-0 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 15L1 1L15 15H1Z" opacity="0.6" />
            <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <span className="tabular-nums leading-none text-gray-700">{Size}</span>
        </div>
      </Tooltip>
    </div>
  )
}

function TraitBadgeChip({ trait }: { trait: string }) {
  return (
    <Tooltip text={trait}>
      <div
        className="flex h-5 w-5 shrink-0 cursor-default items-center justify-center rounded-full text-[8px] font-bold leading-none text-white"
        style={{ backgroundColor: traitColor(trait) }}
      >
        {traitAbbrev(trait)}
      </div>
    </Tooltip>
  )
}

/** Selection slot only — 11px attribute row (grid cards keep MicrobeAttributeRow). */
function SlotAttributeRow({
  Mobility,
  Agility,
  Size,
}: {
  Mobility: number
  Agility: number
  Size: number
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-0 text-[11px] leading-none">
      <Tooltip text="Mobility">
        <div className="flex items-center gap-0.5">
          <svg className="size-[11px] shrink-0 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
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
        </div>
      </Tooltip>
      <Tooltip text="Agility">
        <div className="flex items-center gap-0.5">
          <svg className="size-[11px] shrink-0 text-yellow-500" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9 1L4 9h4l-1 6 5-8H8l1-6z" />
          </svg>
          <span className="tabular-nums text-gray-700">{Agility}</span>
        </div>
      </Tooltip>
      <Tooltip text="Size">
        <div className="flex items-center gap-0.5">
          <svg className="size-[11px] shrink-0 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 15L1 1L15 15H1Z" opacity="0.6" />
            <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <span className="tabular-nums text-gray-700">{Size}</span>
        </div>
      </Tooltip>
    </div>
  )
}

function SlotTraitBadge({ trait }: { trait: string }) {
  return (
    <Tooltip text={trait}>
      <div
        className="flex size-[22px] shrink-0 cursor-default items-center justify-center rounded-full text-[8px] font-bold leading-none text-white"
        style={{ backgroundColor: traitColor(trait) }}
      >
        {traitAbbrev(trait)}
      </div>
    </Tooltip>
  )
}

// --- inlined from components/SimulatorResult.tsx ---
type SimulatorResultProps = {
  result: GameResult
  scenarioRequirements: ScenarioRequirements
  pool: Pool
  onPlayAgain: () => void
}

function formatMmSs(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function resultScoreColorClass(score: number) {
  if (score >= 100) return "text-emerald-600"
  if (score >= 80) return "text-amber-600"
  return "text-red-600"
}

function microbeContribution(
  m: Microbe,
  req: ScenarioRequirements
): "positive" | "negative" | "neutral" {
  if (m.trait === req.undesired_trait) return "negative"
  if (m.trait === req.desired_trait) return "positive"
  return "neutral"
}

function sortedIdsKey(ids: string[]) {
  return [...ids].sort().join("\0")
}

function ResultInfoCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 text-teal-600">{icon}</div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-semibold leading-snug text-gray-900">{value}</p>
    </div>
  )
}

function SimulatorResult({
  result,
  scenarioRequirements,
  pool,
  onPlayAgain,
}: SimulatorResultProps) {
  const { means } = scoreCombo(result.selectedMicrobes, scenarioRequirements)
  const primaryOptimal = result.optimalCombos[0] ?? []
  const optimalScore =
    primaryOptimal.length === 3 ? scoreCombo(primaryOptimal, scenarioRequirements).score : 0

  const playerKey = sortedIdsKey(result.selectedMicrobes.map((m) => m.id))
  const playerFoundOptimal = pool.best_combinations.some(
    (bc) => bc.length === 3 && sortedIdsKey(bc) === playerKey
  )

  const checklist: { label: string; pass: boolean; detail?: string }[] = [
    {
      label: "Mobility mean in range",
      pass: result.conditionResults[0],
      detail: `mean ${means.mobility.toFixed(2)} (need ${scenarioRequirements.attributes.Mobility.min}–${scenarioRequirements.attributes.Mobility.max})`,
    },
    {
      label: "Agility mean in range",
      pass: result.conditionResults[1],
      detail: `mean ${means.agility.toFixed(2)} (need ${scenarioRequirements.attributes.Agility.min}–${scenarioRequirements.attributes.Agility.max})`,
    },
    {
      label: "Size mean in range",
      pass: result.conditionResults[2],
      detail: `mean ${means.size.toFixed(2)} (need ${scenarioRequirements.attributes.Size.min}–${scenarioRequirements.attributes.Size.max})`,
    },
    {
      label: "Desired trait present",
      pass: result.conditionResults[3],
      detail: scenarioRequirements.desired_trait,
    },
    {
      label: "Undesired trait absent",
      pass: result.conditionResults[4],
      detail: scenarioRequirements.undesired_trait,
    },
  ]

  return (
    <div className="min-h-screen w-full bg-white text-gray-900">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Simulation Complete!
          </h1>
          <p className="mt-2 text-lg text-gray-600">Here&apos;s how you performed</p>
        </header>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-500">Your Score</p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${resultScoreColorClass(result.playerScore)}`}>
              {result.playerScore}/100
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-500">Max Possible Score</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-gray-800">{result.maxScore}/100</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-500">Time Spent</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-gray-800">
              {formatMmSs(result.timeSpent)}
            </p>
          </div>
        </div>

        <div className="mb-12 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="inline-flex h-11 items-center justify-center rounded-md bg-gray-900 px-8 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Play Again
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-md border border-gray-300 bg-white px-8 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
          >
            Quit
          </Link>
        </div>

        <section className="mb-12">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Site information</h2>
          <p className="mb-4 text-gray-600">
            <span className="font-medium text-gray-800">{result.scenarioName}</span>
            <span className="mx-2 text-gray-300">·</span>
            <span className="text-gray-600">Scenario #{scenarioRequirements.id}</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <ResultInfoCard
              icon={<Activity className="h-5 w-5" />}
              label="Mobility range"
              value={`${scenarioRequirements.attributes.Mobility.min}–${scenarioRequirements.attributes.Mobility.max}`}
            />
            <ResultInfoCard
              icon={<Zap className="h-5 w-5" />}
              label="Agility range"
              value={`${scenarioRequirements.attributes.Agility.min}–${scenarioRequirements.attributes.Agility.max}`}
            />
            <ResultInfoCard
              icon={<Maximize2 className="h-5 w-5" />}
              label="Size range"
              value={`${scenarioRequirements.attributes.Size.min}–${scenarioRequirements.attributes.Size.max}`}
            />
            <ResultInfoCard
              icon={<Target className="h-5 w-5" />}
              label="Desired trait"
              value={scenarioRequirements.desired_trait}
            />
            <ResultInfoCard
              icon={<XOctagon className="h-5 w-5" />}
              label="Undesired trait"
              value={scenarioRequirements.undesired_trait}
            />
            <ResultInfoCard
              icon={<Gauge className="h-5 w-5" />}
              label="Difficulty"
              value={scenarioRequirements.difficulty}
            />
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Your selection</h2>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {result.selectedMicrobes.map((m) => {
              const c = microbeContribution(m, scenarioRequirements)
              const tone =
                c === "positive"
                  ? "border-emerald-200 bg-emerald-50/60"
                  : c === "negative"
                    ? "border-red-200 bg-red-50/60"
                    : "border-gray-200 bg-gray-50/80"
              const label =
                c === "positive"
                  ? "Positive (desired trait)"
                  : c === "negative"
                    ? "Negative (undesired trait)"
                    : "Neutral"
              return (
                <div key={m.id} className={`rounded-xl border p-4 shadow-sm ${tone}`}>
                  <p className="font-semibold text-gray-900">{m.name}</p>
                  <p className="mt-2 text-sm text-gray-600 tabular-nums">
                    Mobility {m.Mobility} · Agility {m.Agility} · Size {m.Size}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">Trait: {m.trait}</p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
                </div>
              )
            })}
          </div>

          <h3 className="mb-3 text-sm font-semibold text-gray-800">Condition checklist</h3>
          <ul className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            {checklist.map((row) => (
              <li key={row.label} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                <span className="text-lg" aria-hidden>
                  {row.pass ? "✅" : "❌"}
                </span>
                <span className="font-medium text-gray-900">{row.label}</span>
                {row.detail ? (
                  <span className="text-sm text-gray-600 sm:ml-auto">{row.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Trophy className="h-5 w-5 text-amber-500" />
            Optimal combination
          </h2>

          {playerFoundOptimal ? (
            <p className="mb-4 text-lg font-medium text-emerald-700">🎉 You found the optimal combination!</p>
          ) : (
            <p className="mb-4 text-gray-700">The optimal combination was:</p>
          )}

          {result.optimalCombos.map((combo, idx) => (
            <div key={idx} className="mb-6 last:mb-0">
              {result.optimalCombos.length > 1 ? (
                <p className="mb-2 text-sm text-gray-500">Option {idx + 1}</p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-3">
                {combo.map((m) => (
                  <div key={m.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                    <p className="font-medium text-gray-900">{m.name}</p>
                    <p className="mt-1 text-xs text-gray-600 tabular-nums">
                      M {m.Mobility} · A {m.Agility} · S {m.Size}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">{m.trait}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="mt-4 text-sm text-gray-700">
            <span className="font-medium">Optimal combo score:</span>{" "}
            <span className="tabular-nums">{optimalScore}/100</span>
          </p>
        </section>

        {result.maxScore < 100 ? (
          <p className="mx-auto max-w-2xl text-center text-xs text-gray-500">
            Note: perfect scores (100) are not always achievable. The max possible score shown reflects the best
            achievable result for this pool.
          </p>
        ) : null}
      </div>
    </div>
  )
}

const TIMER_START = 30 * 60

export default function SimulatorPage() {
  const [bootState, setBootState] = useState<"loading" | "ready" | "error">("loading")
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [poolsData, setPoolsData] = useState<ScenarioData | null>(null)
  const [scenariosFile, setScenariosFile] = useState<ScenariosFile | null>(null)

  const [gamePhase, setGamePhase] = useState<"playing" | "result">("playing")
  const [pool, setPool] = useState<Pool | null>(null)
  const [scenarioRequirements, setScenarioRequirements] = useState<ScenarioRequirements | null>(
    null
  )
  const [selectedMicrobes, setSelectedMicrobes] = useState<Microbe[]>([])
  const [keyExpanded, setKeyExpanded] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(TIMER_START)
  const [gameResult, setGameResult] = useState<GameResult | null>(null)

  const startRound = useCallback((pools: ScenarioData, file: ScenariosFile) => {
    const picked = pickRandomScenarioPool(pools)
    const req = lookupScenario(file, picked.scenarioName)
    if (!req) {
      throw new Error(`No scenario in scenarios.json matching «${picked.scenarioName}»`)
    }
    setPool(picked.pool)
    setScenarioRequirements(req)
    setSelectedMicrobes([])
    setTimeRemaining(TIMER_START)
    setGamePhase("playing")
    setGameResult(null)
    setKeyExpanded(false)
  }, [])

  const loadData = useCallback(async () => {
    setFetchError(null)
    setBootState("loading")
    try {
      const [poolsRes, scenariosRes] = await Promise.all([
        fetch("/pools.json"),
        fetch("/scenarios.json"),
      ])
      if (!poolsRes.ok) {
        throw new Error("Could not load pools.json")
      }
      if (!scenariosRes.ok) {
        throw new Error("Could not load scenarios.json")
      }
      const poolsJson = (await poolsRes.json()) as ScenarioData
      const scenariosJson = (await scenariosRes.json()) as ScenariosFile
      if (
        !scenariosJson ||
        !Array.isArray(scenariosJson.scenarios) ||
        !Array.isArray(scenariosJson.traits)
      ) {
        throw new Error("scenarios.json is missing required fields")
      }
      setPoolsData(poolsJson)
      setScenariosFile(scenariosJson)
      startRound(poolsJson, scenariosJson)
      setBootState("ready")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load game data"
      setFetchError(msg)
      setBootState("error")
    }
  }, [startRound])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (bootState !== "ready" || gamePhase !== "playing") return
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev <= 0 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [bootState, gamePhase])

  const handlePlayAgain = useCallback(() => {
    if (!poolsData || !scenariosFile) return
    startRound(poolsData, scenariosFile)
  }, [poolsData, scenariosFile, startRound])

  const handleSubmit = useCallback(() => {
    if (!pool || !scenarioRequirements || selectedMicrobes.length !== 3) return
    const elapsed = TIMER_START - timeRemaining
    const { score, conditionResults } = scoreCombo(selectedMicrobes, scenarioRequirements)
    const optimalCombos = resolveOptimalCombos(pool)

    setGameResult({
      selectedMicrobes: [...selectedMicrobes],
      optimalCombos,
      playerScore: score,
      maxScore: pool.max_score,
      scenarioName: scenarioRequirements.name,
      conditionResults,
      timeSpent: elapsed,
    })
    setGamePhase("result")
  }, [pool, scenarioRequirements, selectedMicrobes, timeRemaining])

  const addMicrobe = (microbe: Microbe) => {
    if (selectedMicrobes.length >= 3 || selectedMicrobes.some((m) => m.id === microbe.id)) {
      return
    }
    setSelectedMicrobes([...selectedMicrobes, microbe])
  }

  const removeMicrobe = (microbeId: string) => {
    setSelectedMicrobes(selectedMicrobes.filter((m) => m.id !== microbeId))
  }

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")} min`
  }

  const progressPercent = (timeRemaining / TIMER_START) * 100

  const keyTraits = useMemo(() => {
    if (!scenariosFile || !pool) return []
    const fromFile = scenariosFile.traits
    const inPool = new Set(pool.microbes.map((m) => m.trait))
    const ordered = fromFile.filter((t) => inPool.has(t))
    const extras = [...inPool].filter((t) => !fromFile.includes(t)).sort()
    return [...ordered, ...extras]
  }, [scenariosFile, pool])

  const microbes = useMemo(() => pool?.microbes ?? [], [pool])

  const selectedIds = useMemo(
    () => new Set(selectedMicrobes.map((m) => m.id)),
    [selectedMicrobes],
  )

  if (bootState === "error" && fetchError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4">
        <p className="text-center text-gray-800">{fetchError}</p>
        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-6 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Retry
        </button>
      </div>
    )
  }

  if (bootState === "loading" || !pool || !scenarioRequirements || !scenariosFile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f0faf9]">
        <div
          className="size-10 shrink-0 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600"
          role="status"
          aria-label="Loading"
        />
        <p className="text-sm text-gray-600">Loading simulation…</p>
      </div>
    )
  }

  if (gamePhase === "result" && gameResult) {
    return (
      <SimulatorResult
        result={gameResult}
        scenarioRequirements={scenarioRequirements}
        pool={pool}
        onPlayAgain={handlePlayAgain}
      />
    )
  }

  const trayReserveClass =
    "h-[160px] w-[160px] shrink-0 opacity-0 pointer-events-none"

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-[#4ECDC4] to-[#2BA8A0]">
      {/* Laboratory Background Overlay — v0 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 h-48 w-32 rounded-lg bg-orange-500/30" />
        <div className="absolute top-32 left-60 h-32 w-20 rounded-lg bg-blue-400/30" />
        <div className="absolute right-40 bottom-40 h-24 w-40 rounded-lg bg-red-400/30" />
        <div className="absolute bottom-20 left-40 h-16 w-24 rounded bg-yellow-500/30" />
      </div>

      {/* Top Bar — v0 */}
      <div className="absolute top-0 right-0 left-0 z-20 flex h-14 items-center justify-between bg-[rgba(20,30,50,0.9)] px-6">
        <div className="flex items-center gap-1">
          <div className="flex items-center">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
              1
            </div>
            <span className="ml-1 mr-3 text-sm text-white">Site 1</span>
          </div>
          <div className="h-0.5 w-8 bg-gray-500" />
          <div className="mx-1 flex items-center">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-500 text-xs font-bold text-gray-400">
              2
            </div>
            <span className="mr-3 ml-1 text-sm text-gray-400">Site 2</span>
          </div>
          <div className="h-0.5 w-8 bg-gray-500" />
          <div className="mx-1 flex items-center">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-500 text-xs font-bold text-gray-400">
              3
            </div>
            <span className="ml-1 text-sm text-gray-400">Site 3</span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-sm tabular-nums text-white">
            Time remaining: {formatCountdown(timeRemaining)}
          </span>
          <div className="mt-1 h-2 w-64 overflow-hidden rounded-full bg-gray-700">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" className="text-white/70 transition-colors hover:text-white">
            <Settings className="h-5 w-5" />
          </button>
          <Link href="/" className="text-white/70 transition-colors hover:text-white" aria-label="Quit to home">
            <LogOut className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Task Panel — v0 */}
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
          <span className="font-semibold">Select 3 microbes</span> whose averaged Attributes and collective Traits most
          effectively match the Site Information.
        </p>
        <div className="flex cursor-pointer items-center gap-2 text-blue-400 hover:text-blue-300">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
            <HelpCircle className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm">Help</span>
        </div>
      </div>

      {/* Site Information Panel — v0 */}
      <div className="absolute top-20 right-6 z-10 w-56 rounded-lg bg-[#FFF9C4] p-4 shadow-lg">
        <h3 className="mb-3 text-sm font-bold text-gray-800 uppercase">Site 1 Information</h3>
        <p className="mb-3 text-xs font-medium text-gray-700">{scenarioRequirements.name}</p>
        <div className="mb-3">
          <div className="mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-800" />
            <span className="text-sm font-bold text-gray-800">ATTRIBUTES</span>
          </div>
          <div className="space-y-0.5 pl-3 text-sm text-gray-700">
            <p>
              Mobility: {scenarioRequirements.attributes.Mobility.min}–{scenarioRequirements.attributes.Mobility.max}
            </p>
            <p>
              Agility: {scenarioRequirements.attributes.Agility.min}–{scenarioRequirements.attributes.Agility.max}
            </p>
            <p>
              Size: {scenarioRequirements.attributes.Size.min}–{scenarioRequirements.attributes.Size.max}
            </p>
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-800" />
            <span className="text-sm font-bold text-gray-800">TRAIT</span>
          </div>
          <div className="space-y-0.5 pl-3 text-sm">
            <p>
              <span className="text-gray-700">Desired:</span>{" "}
              <span className="font-medium text-green-600">{scenarioRequirements.desired_trait}</span>
            </p>
            <p>
              <span className="text-gray-700">Undesired:</span>{" "}
              <span className="font-medium text-red-600">{scenarioRequirements.undesired_trait}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Selection Slots + Submit — v0 layout */}
      <div className="absolute top-[12%] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3">
        <div className="flex gap-4">
          {[0, 1, 2].map((slotIndex) => {
            const sel = selectedMicrobes[slotIndex]
            if (!sel) {
              return (
                <div
                  key={`slot-empty-${slotIndex}`}
                  className="flex h-[160px] w-[160px] items-center justify-center rounded-xl border-2 border-dashed border-white/50 bg-white/30 transition-all hover:bg-white/40"
                  aria-label={`Selection slot empty ${slotIndex + 1}`}
                >
                  <span className="h-8 w-8 shrink-0 rounded border-2 border-dashed border-white/40" aria-hidden />
                </div>
              )
            }
            const blobIdx = Math.max(0, microbes.findIndex((m) => m.id === sel.id))
            const col = MICROBE_PALETTE[blobIdx % MICROBE_PALETTE.length] ?? "#808080"
            const Svg = microbeComponents[blobIdx] ?? MicrobeBlob1
            return (
              <div
                key={`${sel.id}-slot-${slotIndex}`}
                className="relative flex h-[160px] w-[160px] shrink-0 flex-col rounded-xl border-2 border-solid border-blue-400 bg-white shadow-lg"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeMicrobe(sel.id)
                  }}
                  className="absolute top-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-sm hover:bg-[#1d4ed8]"
                  aria-label={`Remove ${sel.name} from selection`}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 px-2 pb-1 pt-2">
                  <div className="flex shrink-0 items-center justify-center [&_svg]:block [&_svg]:h-10 [&_svg]:w-10">
                    <Svg color={col} />
                  </div>
                  <p className="line-clamp-2 w-full text-center text-[13px] font-bold leading-tight text-gray-800">
                    {sel.name}
                  </p>
                  <SlotAttributeRow Mobility={sel.Mobility} Agility={sel.Agility} Size={sel.Size} />
                  <SlotTraitBadge trait={sel.trait} />
                </div>
              </div>
            )
          })}
        </div>
        <button
          type="button"
          disabled={selectedMicrobes.length !== 3}
          onClick={handleSubmit}
          className={`rounded-lg px-6 py-2 font-medium transition-all ${
            selectedMicrobes.length === 3
              ? "cursor-pointer bg-[rgba(20,30,50,0.9)] text-white hover:bg-[rgba(30,40,60,0.95)]"
              : "cursor-not-allowed bg-gray-500/50 text-gray-300"
          }`}
        >
          Submit Treatment
        </button>
      </div>

      {/* Microbe Grid — v0 layout + index-stable selection holes */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
        <div className="grid w-[848px] grid-cols-5 gap-3">
          {Array.from({ length: GRID_MICROBE_SLOTS }, (_, idx) => {
            const microbe = microbes[idx]
            if (!microbe) {
              return <div key={`cell-${idx}`} className={trayReserveClass} aria-hidden />
            }
            const MicrobeSvg = microbeComponents[idx] ?? MicrobeBlob1
            const blobColor = MICROBE_PALETTE[idx % MICROBE_PALETTE.length] ?? "#808080"
            const isSel = selectedIds.has(microbe.id)
            if (isSel) {
              return <div key={microbe.id} className="h-[160px] w-[160px]" />
            }
            return (
              <button
                key={microbe.id}
                type="button"
                className="flex h-[160px] w-[160px] cursor-pointer flex-col rounded-xl border-2 border-transparent bg-white p-2 text-left shadow-lg transition-all hover:shadow-xl"
                onClick={() => addMicrobe(microbe)}
              >
                <div className="mb-1 w-full truncate text-xs font-semibold text-gray-800">{microbe.name}</div>
                <div className="mb-1 flex shrink-0 justify-center [&_svg]:h-10 [&_svg]:w-10">
                  <MicrobeSvg color={blobColor} />
                </div>
                <div className="mt-auto flex items-center justify-between gap-1">
                  <MicrobeAttributeRow
                    Mobility={microbe.Mobility}
                    Agility={microbe.Agility}
                    Size={microbe.Size}
                  />
                  <TraitBadgeChip trait={microbe.trait} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Key Panel — v0 */}
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
                <p className="mb-1 text-xs text-gray-400">Actions</p>
                <div className="space-y-1 text-sm text-white">
                  <div className="flex items-center gap-2">
                    <Plus className="h-3 w-3" />
                    <span>Add Microbe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Minus className="h-3 w-3" />
                    <span>Remove Microbe</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-400">Attributes</p>
                <div className="space-y-1 text-sm text-white">
                  {scenariosFile.attributes.map((attr) => (
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
                      <div
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: traitColor(trait) }}
                      />
                      <span>{trait}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
