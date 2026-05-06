"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  Settings,
  LogOut,
  HelpCircle,
  Star,
  ChevronUp,
  ChevronDown,
  Flame,
  Shield,
  Layers,
  Droplets,
} from "lucide-react"

type Microbe = {
  id: string
  name: string
  Mobility: number
  Agility: number
  Size: number
  trait: string
}

type ScenarioAttributeRanges = {
  Mobility: { min: number; max: number }
  Agility: { min: number; max: number }
  Size: { min: number; max: number }
}

type ScenarioRequirements = {
  id: number
  name: string
  attributes: ScenarioAttributeRanges
  desired_trait: string
  undesired_trait: string
}

type ScenariosFile = {
  traits: string[]
  attributes: string[]
  scenarios: ScenarioRequirements[]
}

type Phase2Candidate = {
  microbe: Microbe
  classification: "optimal" | "neutral" | "negative"
  neutral_score: number | null
  conditions_satisfied: number
}

type Phase2ChooseSet = {
  round: number
  is_trap_round: boolean
  candidates: Phase2Candidate[]
}

type Phase2Scenario = {
  phase2_id: string
  source_pool_id: string
  scenario_name: string
  preloaded_microbes: Microbe[]
  choose_sets: Phase2ChooseSet[]
  optimal_final_pool: Microbe[]
  optimal_max_score: number
  original_max_score: number
  has_trait_trap: boolean
  has_undesired_bait: boolean
}

const GRID_MICROBE_SLOTS = 10
const TOTAL_ROUNDS = 4

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
    <path
      d="M40 18 L40 8 M45 10 L40 8 L35 10"
      stroke={color}
      strokeWidth="2"
      fill="none"
    />
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
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 max-w-xs -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-left text-xs text-white whitespace-normal">
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

/** Selection slot only — attribute row (grid cards keep MicrobeAttributeRow). */
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
        <span className="font-bold tabular-nums text-gray-800">{Mobility}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <svg className="size-[13px] shrink-0 text-yellow-500" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9 1L4 9h4l-1 6 5-8H8l1-6z" />
          </svg>
          <span className="text-gray-600">Agility</span>
        </div>
        <span className="font-bold tabular-nums text-gray-800">{Agility}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <svg className="size-[13px] shrink-0 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 15L1 1L15 15H1Z" opacity="0.6" />
            <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <span className="text-gray-600">Size</span>
        </div>
        <span className="font-bold tabular-nums text-gray-800">{Size}</span>
      </div>
    </div>
  )
}

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

function attributeKeyIcon(attribute: string) {
  switch (attribute) {
    case "Mobility":
      return <span className="inline-block h-3 w-3 rounded-sm bg-gray-400" />
    case "Agility":
      return <span className="inline-block h-3 w-3 rounded-sm bg-yellow-500" />
    case "Size":
      return <span className="inline-block h-3 w-3 rounded-sm bg-blue-400" />
    default:
      return <span className="inline-block h-3 w-3 rounded-sm bg-gray-500" />
  }
}

function lookupScenario(file: ScenariosFile, name: string): ScenarioRequirements | null {
  return file.scenarios.find((s) => s.name === name) ?? null
}

export default function Phase2Page() {
  const [bootState, setBootState] = useState<"loading" | "ready" | "error">("loading")
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [scenariosFile, setScenariosFile] = useState<ScenariosFile | null>(null)
  const [phase2Scenario, setPhase2Scenario] = useState<Phase2Scenario | null>(null)
  const [scenarioRequirements, setScenarioRequirements] = useState<ScenarioRequirements | null>(null)
  const [poolMicrobes, setPoolMicrobes] = useState<Microbe[]>([])
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [keyExpanded, setKeyExpanded] = useState(false)
  const [phaseComplete, setPhaseComplete] = useState(false)
  const [resultsPlaceholder, setResultsPlaceholder] = useState(false)

  const loadData = useCallback(async () => {
    setBootState("loading")
    setFetchError(null)
    try {
      const [phase2Res, scenariosRes] = await Promise.all([
        fetch("/phase2_pools.json"),
        fetch("/scenarios.json"),
      ])
      if (!phase2Res.ok) throw new Error("Could not load phase2_pools.json")
      if (!scenariosRes.ok) throw new Error("Could not load scenarios.json")

      const phase2Json = (await phase2Res.json()) as Record<string, Phase2Scenario[]>
      const scenariosJson = (await scenariosRes.json()) as ScenariosFile
      const scenarioNames = Object.keys(phase2Json).filter((k) => Array.isArray(phase2Json[k]) && phase2Json[k]!.length)
      if (!scenarioNames.length) throw new Error("No Phase 2 scenarios available")
      const scenarioName = scenarioNames[Math.floor(Math.random() * scenarioNames.length)]!
      const entries = phase2Json[scenarioName]!
      const picked = entries[Math.floor(Math.random() * entries.length)]!
      const req = lookupScenario(scenariosJson, picked.scenario_name)
      if (!req) throw new Error(`Scenario requirements not found for ${picked.scenario_name}`)

      setScenariosFile(scenariosJson)
      setPhase2Scenario(picked)
      setScenarioRequirements(req)
      setPoolMicrobes([...picked.preloaded_microbes])
      setCurrentRoundIdx(0)
      setSelectedCandidateId(null)
      setPhaseComplete(false)
      setResultsPlaceholder(false)
      setKeyExpanded(false)
      setBootState("ready")
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to load Phase 2 data")
      setBootState("error")
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const currentChooseSet = useMemo(() => {
    if (!phase2Scenario || currentRoundIdx >= TOTAL_ROUNDS) return null
    return phase2Scenario.choose_sets[currentRoundIdx] ?? null
  }, [phase2Scenario, currentRoundIdx])

  const keyTraits = useMemo(() => {
    if (!scenariosFile || !poolMicrobes.length) return []
    const inPool = new Set(poolMicrobes.map((m) => m.trait))
    const ordered = scenariosFile.traits.filter((t) => inPool.has(t))
    const extras = [...inPool].filter((t) => !scenariosFile.traits.includes(t)).sort()
    return [...ordered, ...extras]
  }, [scenariosFile, poolMicrobes])

  const confirmSelection = () => {
    if (!currentChooseSet || !selectedCandidateId) return
    const chosen = currentChooseSet.candidates.find((c) => c.microbe.id === selectedCandidateId)?.microbe
    if (!chosen) return
    setPoolMicrobes((prev) => [...prev, chosen])
    setSelectedCandidateId(null)
    if (currentRoundIdx >= TOTAL_ROUNDS - 1) {
      setPhaseComplete(true)
      return
    }
    setCurrentRoundIdx((r) => r + 1)
  }

  if (bootState === "error" && fetchError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4">
        <p className="text-center text-gray-800">{fetchError}</p>
        <button type="button" onClick={() => void loadData()} className="rounded bg-gray-900 px-4 py-2 text-white">
          Retry
        </button>
      </div>
    )
  }

  if (bootState !== "ready" || !phase2Scenario || !scenarioRequirements || !scenariosFile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0faf9]">
        <p className="text-sm text-gray-600">Loading Phase 2...</p>
      </div>
    )
  }

  if (phaseComplete || resultsPlaceholder) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#f8fffe] px-4 text-center">
        {!resultsPlaceholder ? (
          <>
            <h1 className="text-3xl font-bold text-[#1a202c]">Pool Complete</h1>
            <p className="text-gray-600">You have completed all 4 selection rounds.</p>
            <button
              type="button"
              onClick={() => setResultsPlaceholder(true)}
              className="rounded-lg bg-[#4ECDC4] px-6 py-3 font-semibold text-[#1a202c]"
            >
              See Results
            </button>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-[#1a202c]">Results Placeholder</h1>
            <p className="text-gray-600">Phase 2 scoring screen will be implemented next.</p>
            <button type="button" onClick={() => void loadData()} className="rounded-lg bg-[#1a202c] px-6 py-3 text-white">
              Play Again
            </button>
          </>
        )}
      </div>
    )
  }

  const candidates = currentChooseSet?.candidates ?? []

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-[#4ECDC4] to-[#2BA8A0]">
      <div className="absolute top-0 right-0 left-0 z-20 flex h-14 items-center justify-between bg-[rgba(20,30,50,0.9)] px-6">
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((n, idx) => {
            const completed = false
            const active = true
            const dotClass = completed ? "bg-emerald-500" : active ? "bg-blue-500" : "border-2 border-gray-500 bg-transparent"
            return (
              <div key={n} className="flex items-center">
                {idx > 0 ? <div className="mx-1 h-0.5 w-6 bg-gray-600" /> : null}
                <div className={`h-3 w-3 rounded-full ${dotClass}`} />
                <span className="ml-2 text-sm text-white">Site {n}</span>
              </div>
            )
          })}
        </div>
        <div className="text-sm text-white">Prospect Pool Selection</div>
        <div className="flex items-center gap-3">
          <button type="button" className="text-white/70 hover:text-white">
            <Settings className="h-5 w-5" />
          </button>
          <Link href="/" className="text-white/70 hover:text-white" aria-label="Quit to home">
            <LogOut className="h-5 w-5" />
          </Link>
        </div>
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
        <p className="mb-4 text-xs text-white/70">Round {currentRoundIdx + 1} of 4</p>
        <div className="flex cursor-pointer items-center gap-2 text-blue-400 hover:text-blue-300">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
            <HelpCircle className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm">Help</span>
        </div>
      </div>

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
          <div className="space-y-2 pl-3 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-600">Desired</p>
              <p
                className="flex items-center gap-1 font-medium"
                style={{ color: traitColor(scenarioRequirements.desired_trait) }}
              >
                {traitIcon(scenarioRequirements.desired_trait, "h-3 w-3 shrink-0")}
                {scenarioRequirements.desired_trait}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">Undesired</p>
              <p
                className="flex items-center gap-1 font-medium"
                style={{ color: traitColor(scenarioRequirements.undesired_trait) }}
              >
                {traitIcon(scenarioRequirements.undesired_trait, "h-3 w-3 shrink-0")}
                {scenarioRequirements.undesired_trait}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-[14%] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center">
        <div className="flex gap-4">
          {candidates.map((candidate, idx) => {
            const m = candidate.microbe
            const isSelected = selectedCandidateId === m.id
            const anotherSelected = selectedCandidateId !== null && !isSelected
            const blobColor = MICROBE_PALETTE[idx % MICROBE_PALETTE.length] ?? "#808080"
            const Svg = microbeComponents[idx % microbeComponents.length] ?? MicrobeBlob1
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedCandidateId((prev) => (prev === m.id ? null : m.id))}
                className={`flex h-[220px] w-[160px] flex-col rounded-xl border-2 bg-white p-2 text-left shadow-lg transition-all ${
                  isSelected
                    ? "border-[#4ECDC4] bg-[#ecfdfb]"
                    : "border-[#d1d5db]"
                } ${anotherSelected ? "opacity-60" : "opacity-100"}`}
              >
                <div className="mb-1 w-full text-center text-sm font-bold text-gray-800 line-clamp-1">{m.name}</div>
                <div className="mb-1 flex shrink-0 justify-center">
                  <Svg color={blobColor} />
                </div>
                <div className="mt-auto flex w-full flex-col items-center gap-2 px-1">
                  <SlotAttributeRow
                    Mobility={m.Mobility}
                    Agility={m.Agility}
                    Size={m.Size}
                  />
                  <TraitBadgeChip
                    trait={m.trait}
                    chipClassName="h-8 w-8"
                  />
                </div>
              </button>
            )
          })}
        </div>
        <button
          type="button"
          disabled={!selectedCandidateId}
          onClick={confirmSelection}
          className={`mt-5 rounded-lg px-6 py-2 font-medium ${
            selectedCandidateId
              ? "bg-[rgba(20,30,50,0.9)] text-white hover:bg-[rgba(30,40,60,0.95)]"
              : "cursor-not-allowed bg-gray-500/50 text-gray-300"
          }`}
        >
          Confirm Selection
        </button>
      </div>

      <div className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2">
        <div className="grid w-[864px] gap-4 [grid-template-columns:repeat(5,160px)]">
          {Array.from({ length: GRID_MICROBE_SLOTS }, (_, idx) => {
            const m = poolMicrobes[idx]
            if (!m) {
              return (
                <div
                  key={`pool-empty-${idx}`}
                  className="h-[160px] w-[160px] rounded-xl border-2 border-dashed border-gray-300 bg-white/40"
                />
              )
            }
            const blobColor = MICROBE_PALETTE[idx % MICROBE_PALETTE.length] ?? "#808080"
            const Svg = microbeComponents[idx % microbeComponents.length] ?? MicrobeBlob1
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
                  <MicrobeAttributeRow
                    Mobility={m.Mobility}
                    Agility={m.Agility}
                    Size={m.Size}
                  />
                  <TraitBadgeChip trait={m.trait} />
                </div>
              </div>
            )
          })}
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
    </div>
  )
}

