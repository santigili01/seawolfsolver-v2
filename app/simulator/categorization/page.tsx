"use client"

/**
 * Microbe Categorization simulator — Step 2 (with Phase 0 review).
 * Visual components copied from app/simulator/page.tsx per project convention.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
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

type CategorizationMicrobe = {
  id: string
  name: string
  Mobility: number
  Agility: number
  Size: number
  trait: string
}

type RevealedCharacteristic = {
  type: "trait" | "attribute"
  name: string
  value: string | { min: number; max: number }
}

type SiteRequirements = {
  attributes: {
    Mobility: { min: number; max: number }
    Agility: { min: number; max: number }
    Size: { min: number; max: number }
  }
  desired_trait: string
  undesired_trait: string
}

type CategorizationPool = {
  categorization_id: string
  site1_scenario: string
  site2_scenario: string
  site1_requirements: SiteRequirements
  site2_requirements: SiteRequirements
  revealed_characteristic: RevealedCharacteristic
  microbes: CategorizationMicrobe[]
  correct_categorization: {
    site1: { id: string; reason: string }[]
    site2: { id: string; reason: string }[]
    return: { id: string; reason: string }[]
  }
}

type PoolsFile = Record<string, CategorizationPool[]>

type GamePhase =
  | "p2_site1"
  | "p2_site0_site2"
  | "p2_site2"
  | "p2_site0_site3"
  | "p2_site3"
  | "complete"

type P2Choice = "site1" | "site2" | "return"

type Phase0Choice = "keep" | "discard"

type DecisionEntry =
  | {
      phase: GamePhase
      kind: "p2"
      microbeId: string
      poolId: string
      choice: P2Choice
    }
  | {
      phase: GamePhase
      kind: "p0"
      microbeId: string
      poolId: string
      choice: Phase0Choice
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

const TIMER_START = 30 * 60

function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")} min`
}

function randomPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function flattenPools(data: PoolsFile): CategorizationPool[] {
  return Object.keys(data).flatMap((k) => data[k] ?? [])
}

function pickPoolChain(data: PoolsFile): {
  site1Pool: CategorizationPool
  site2Pool: CategorizationPool
  site3Pool: CategorizationPool
} {
  const keys = Object.keys(data).filter((k) => (data[k]?.length ?? 0) > 0)
  if (keys.length === 0) {
    throw new Error("No categorization pools in JSON")
  }
  const flat = flattenPools(data)
  const pickFromKey = randomPick(keys)!
  const site1Pool = randomPick(data[pickFromKey]!)

  const s2 = site1Pool.site2_scenario
  const match2 = flat.filter((p) => p.site1_scenario === s2)
  const site2Pool = match2.length > 0 ? randomPick(match2) : randomPick(flat)

  const s3 = site2Pool.site2_scenario
  const match3 = flat.filter((p) => p.site1_scenario === s3)
  const site3Pool = match3.length > 0 ? randomPick(match3) : randomPick(flat)

  return { site1Pool, site2Pool, site3Pool }
}

function blobIndex(poolMicrobes: CategorizationMicrobe[], id: string): number {
  const i = poolMicrobes.findIndex((m) => m.id === id)
  return Math.max(0, i)
}

function formatRevealedLine(r: RevealedCharacteristic): string {
  if (r.type === "trait") {
    return String(r.value)
  }
  const v = r.value as { min: number; max: number }
  return `${r.name}: ${v.min}–${v.max}`
}

function revealedTypeLabel(r: RevealedCharacteristic): string {
  return r.type === "trait" ? "TRAIT" : "ATTRIBUTE"
}

type ScenariosFile = {
  traits: string[]
  attributes: string[]
}

function collapsedBlobFromPool(m: CategorizationMicrobe, poolMs: CategorizationMicrobe[]) {
  const bi = blobIndex(poolMs, m.id)
  const SvgC = microbeComponents[bi % microbeComponents.length] ?? MicrobeBlob1
  const c = MICROBE_PALETTE[bi % MICROBE_PALETTE.length] ?? "#808080"
  return <SvgC color={c} />
}

export default function CategorizationSimulatorPage() {
  const [bootState, setBootState] = useState<"loading" | "ready" | "error">("loading")
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [scenariosFile, setScenariosFile] = useState<ScenariosFile | null>(null)

  const [currentPhase, setCurrentPhase] = useState<GamePhase>("p2_site1")
  const [currentMicrobeIndex, setCurrentMicrobeIndex] = useState(0)
  const [site1Pool, setSite1Pool] = useState<CategorizationPool | null>(null)
  const [site2Pool, setSite2Pool] = useState<CategorizationPool | null>(null)
  const [site3Pool, setSite3Pool] = useState<CategorizationPool | null>(null)

  const [taggedForSite2, setTaggedForSite2] = useState<CategorizationMicrobe[]>([])
  const [taggedForSite3, setTaggedForSite3] = useState<CategorizationMicrobe[]>([])

  const [phase0Site2Results, setPhase0Site2Results] = useState<
    { microbe: CategorizationMicrobe; confirmed: boolean }[]
  >([])
  const [phase0Site3Results, setPhase0Site3Results] = useState<
    { microbe: CategorizationMicrobe; confirmed: boolean }[]
  >([])

  const [allDecisions, setAllDecisions] = useState<DecisionEntry[]>([])

  const [timeRemaining, setTimeRemaining] = useState(TIMER_START)
  const [keyExpanded, setKeyExpanded] = useState(false)

  /** Phase 2 column contents */
  const [p2Buckets, setP2Buckets] = useState<
    Record<"bucket1" | "bucket2" | "bucket3", CategorizationMicrobe[]>
  >({ bucket1: [], bucket2: [], bucket3: [] })

  const [p2Selected, setP2Selected] = useState<P2Choice | null>(null)
  const [p0Selected, setP0Selected] = useState<Phase0Choice | null>(null)

  const [expandedColumnIds, setExpandedColumnIds] = useState<Set<string>>(() => new Set())

  const startNewGame = useCallback((data: PoolsFile) => {
    const chain = pickPoolChain(data)
    setSite1Pool(chain.site1Pool)
    setSite2Pool(chain.site2Pool)
    setSite3Pool(chain.site3Pool)
    setCurrentPhase("p2_site1")
    setCurrentMicrobeIndex(0)
    setTaggedForSite2([])
    setTaggedForSite3([])
    setPhase0Site2Results([])
    setPhase0Site3Results([])
    setAllDecisions([])
    setP2Buckets({ bucket1: [], bucket2: [], bucket3: [] })
    setP2Selected(null)
    setP0Selected(null)
    setExpandedColumnIds(new Set())
    setTimeRemaining(TIMER_START)
  }, [])

  const loadData = useCallback(async () => {
    setBootState("loading")
    setFetchError(null)
    try {
      const [poolsRes, scenRes] = await Promise.all([
        fetch("/categorization_pools.json"),
        fetch("/scenarios.json"),
      ])
      if (!poolsRes.ok) throw new Error(`Could not load categorization pools (${poolsRes.status})`)
      if (!scenRes.ok) throw new Error(`Could not load scenarios (${scenRes.status})`)
      const poolsJson = (await poolsRes.json()) as PoolsFile
      const scenJson = (await scenRes.json()) as ScenariosFile
      setScenariosFile(scenJson)
      startNewGame(poolsJson)
      setBootState("ready")
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e))
      setBootState("error")
    }
  }, [startNewGame])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev <= 0 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setP2Selected(null)
    setP0Selected(null)
  }, [currentPhase])

  const activeSiteDot = useMemo(() => {
    switch (currentPhase) {
      case "p2_site1":
        return 1
      case "p2_site0_site2":
      case "p2_site2":
        return 2
      case "p2_site0_site3":
      case "p2_site3":
        return 3
      case "complete":
        return 4
      default:
        return 1
    }
  }, [currentPhase])

  const progressPercent = (timeRemaining / TIMER_START) * 100

  /** Current pool + requirements context */
  const phaseContext = useMemo(() => {
    if (!site1Pool || !site2Pool || !site3Pool) return null
    switch (currentPhase) {
      case "p2_site1":
        return {
          pool: site1Pool,
          currentReq: site1Pool.site1_requirements,
          currentSiteNum: 1,
          scenarioLabel: site1Pool.site1_scenario,
          currentSiteName: site1Pool.site1_scenario,
          nextSiteName: site1Pool.site2_scenario,
          nextSiteNum: 2,
          nextReq: site1Pool.site2_requirements,
          revealed: site1Pool.revealed_characteristic,
          showInsight: true,
          microbeIdsOrder: site1Pool.microbes.map((m) => m.id),
        }
      case "p2_site0_site2":
        return {
          pool: site2Pool,
          currentReq: site2Pool.site1_requirements,
          currentSiteNum: 2,
          scenarioLabel: site2Pool.site1_scenario,
          currentSiteName: site2Pool.site1_scenario,
          nextSiteName: site2Pool.site2_scenario,
          nextSiteNum: 3,
          nextReq: null,
          revealed: null as RevealedCharacteristic | null,
          showInsight: false,
          microbeIdsOrder: [],
        }
      case "p2_site2":
        return {
          pool: site2Pool,
          currentReq: site2Pool.site1_requirements,
          currentSiteNum: 2,
          scenarioLabel: site2Pool.site1_scenario,
          currentSiteName: site2Pool.site1_scenario,
          nextSiteName: site2Pool.site2_scenario,
          nextSiteNum: 3,
          nextReq: site2Pool.site2_requirements,
          revealed: site2Pool.revealed_characteristic,
          showInsight: true,
          microbeIdsOrder: site2Pool.microbes.map((m) => m.id),
        }
      case "p2_site0_site3":
        return {
          pool: site3Pool,
          currentReq: site3Pool.site1_requirements,
          currentSiteNum: 3,
          scenarioLabel: site3Pool.site1_scenario,
          currentSiteName: site3Pool.site1_scenario,
          nextSiteName: site3Pool.site2_scenario,
          nextSiteNum: null as number | null,
          nextReq: null,
          revealed: null,
          showInsight: false,
          microbeIdsOrder: [],
        }
      case "p2_site3":
        return {
          pool: site3Pool,
          currentReq: site3Pool.site1_requirements,
          currentSiteNum: 3,
          scenarioLabel: site3Pool.site1_scenario,
          currentSiteName: site3Pool.site1_scenario,
          /** Site 3 is the last playable site — no “next site” column in gameplay. */
          nextSiteName: null as string | null,
          nextSiteNum: null as number | null,
          nextReq: site3Pool.site2_requirements,
          revealed: site3Pool.revealed_characteristic,
          showInsight: true,
          microbeIdsOrder: site3Pool.microbes.map((m) => m.id),
        }
      default:
        return null
    }
  }, [currentPhase, site1Pool, site2Pool, site3Pool])

  const currentMicrobePhase2 = useMemo(() => {
    if (!phaseContext || phaseContext.microbeIdsOrder.length === 0) return null
    const pool = phaseContext.pool
    return pool.microbes[currentMicrobeIndex] ?? null
  }, [phaseContext, currentMicrobeIndex])

  const phase0List = useMemo(() => {
    if (currentPhase === "p2_site0_site2") return taggedForSite2
    if (currentPhase === "p2_site0_site3") return taggedForSite3
    return []
  }, [currentPhase, taggedForSite2, taggedForSite3])

  const currentMicrobePhase0 = phase0List[currentMicrobeIndex] ?? null

  const isPhase0 =
    currentPhase === "p2_site0_site2" || currentPhase === "p2_site0_site3"

  const poolForKey = phaseContext?.pool ?? site1Pool

  const keyTraits = useMemo(() => {
    if (!scenariosFile || !poolForKey) return []
    const fromFile = scenariosFile.traits
    const inPool = new Set(poolForKey.microbes.map((m) => m.trait))
    const ordered = fromFile.filter((t) => inPool.has(t))
    const extras = [...inPool].filter((t) => !fromFile.includes(t)).sort()
    return [...ordered, ...extras]
  }, [scenariosFile, poolForKey])

  const remainingCount = isPhase0
    ? Math.max(0, phase0List.length - currentMicrobeIndex)
    : phaseContext
      ? Math.max(0, 10 - currentMicrobeIndex)
      : 0

  const blobSourceForMainCard = useMemo(() => {
    if (!site1Pool || !site2Pool || !phaseContext) return [] as CategorizationMicrobe[]
    if (isPhase0) {
      if (currentPhase === "p2_site0_site2") return site1Pool.microbes
      if (currentPhase === "p2_site0_site3") return site2Pool.microbes
    }
    return phaseContext.pool.microbes
  }, [currentPhase, isPhase0, phaseContext, site1Pool, site2Pool])

  const toggleExpand = (uid: string) => {
    setExpandedColumnIds((prev) => {
      const n = new Set(prev)
      if (n.has(uid)) n.delete(uid)
      else n.add(uid)
      return n
    })
  }

  const pushDecision = (d: DecisionEntry) => {
    setAllDecisions((prev) => [...prev, d])
  }

  const handleSubmitP2 = () => {
    if (!phaseContext || !currentMicrobePhase2 || p2Selected === null) return
    const microbe = currentMicrobePhase2
    const choice = p2Selected
    const pool = phaseContext.pool
    const phase = currentPhase
    const idx = currentMicrobeIndex

    const bucketKey: "bucket1" | "bucket2" | "bucket3" =
      choice === "site1" ? "bucket1" : choice === "site2" ? "bucket2" : "bucket3"

    const nextBuckets = {
      bucket1: [...p2Buckets.bucket1],
      bucket2: [...p2Buckets.bucket2],
      bucket3: [...p2Buckets.bucket3],
    }
    nextBuckets[bucketKey].push(microbe)

    setP2Buckets(nextBuckets)
    pushDecision({
      phase,
      kind: "p2",
      microbeId: microbe.id,
      poolId: pool.categorization_id,
      choice,
    })
    setP2Selected(null)

    if (idx < 9) {
      setCurrentMicrobeIndex((i) => i + 1)
      return
    }

    setCurrentMicrobeIndex(0)
    setP2Buckets({ bucket1: [], bucket2: [], bucket3: [] })

    if (phase === "p2_site1") {
      setTaggedForSite2(nextBuckets.bucket2)
      setCurrentPhase(nextBuckets.bucket2.length === 0 ? "p2_site2" : "p2_site0_site2")
      return
    }
    if (phase === "p2_site2") {
      setTaggedForSite3(nextBuckets.bucket2)
      setCurrentPhase(nextBuckets.bucket2.length === 0 ? "p2_site3" : "p2_site0_site3")
      return
    }
    if (phase === "p2_site3") {
      setCurrentPhase("complete")
    }
  }

  const handleSubmitP0 = () => {
    if (!phaseContext || !currentMicrobePhase0 || p0Selected === null) return
    const pool = phaseContext.pool
    const confirmed = p0Selected === "keep"
    const entry = { microbe: currentMicrobePhase0, confirmed }
    if (currentPhase === "p2_site0_site2") {
      setPhase0Site2Results((r) => [...r, entry])
    } else {
      setPhase0Site3Results((r) => [...r, entry])
    }
    pushDecision({
      phase: currentPhase,
      kind: "p0",
      microbeId: currentMicrobePhase0.id,
      poolId: pool.categorization_id,
      choice: p0Selected,
    })
    setP0Selected(null)

    if (currentMicrobeIndex >= phase0List.length - 1) {
      setCurrentMicrobeIndex(0)
      if (currentPhase === "p2_site0_site2") {
        setCurrentPhase("p2_site2")
        setP2Buckets({ bucket1: [], bucket2: [], bucket3: [] })
      } else {
        setCurrentPhase("p2_site3")
        setP2Buckets({ bucket1: [], bucket2: [], bucket3: [] })
      }
    } else {
      setCurrentMicrobeIndex((i) => i + 1)
    }
  }

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

  if (bootState === "loading" || !site1Pool || !site2Pool || !site3Pool || !phaseContext) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f0faf9]">
        <div
          className="size-10 shrink-0 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600"
          role="status"
          aria-label="Loading"
        />
        <p className="text-sm text-gray-600">Loading categorization…</p>
      </div>
    )
  }

  if (currentPhase === "complete") {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-[#4ECDC4] to-[#2BA8A0] px-4">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 h-48 w-32 rounded-lg bg-orange-500/30" />
          <div className="absolute bottom-20 right-40 h-24 w-40 rounded-lg bg-red-400/30" />
        </div>
        <h1 className="relative z-10 text-center text-3xl font-bold text-white md:text-4xl">
          Categorization Complete!
        </h1>
        <div className="relative z-10 mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-lg bg-white/40 px-6 py-3 text-sm font-semibold text-white/70"
          >
            See Results
          </button>
          <button
            type="button"
            onClick={() => typeof window !== "undefined" && window.location.reload()}
            className="rounded-lg bg-[rgba(20,30,50,0.9)] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[rgba(30,40,60,0.95)]"
          >
            Play Again
          </button>
        </div>
      </div>
    )
  }

  const displayedMicrobe = isPhase0 ? currentMicrobePhase0 : currentMicrobePhase2
  const ix = displayedMicrobe ? blobIndex(blobSourceForMainCard, displayedMicrobe.id) : 0
  const Svg = microbeComponents[ix % microbeComponents.length] ?? MicrobeBlob1
  const col = MICROBE_PALETTE[ix % MICROBE_PALETTE.length] ?? "#808080"

  const siteStickyReq = phaseContext.currentReq

  const site1Label = `Site ${phaseContext.currentSiteNum}`
  const site2Label = phaseContext.nextSiteNum ? `Site ${phaseContext.nextSiteNum}` : null
  const isLastSite = site2Label === null

  type ColumnMicrobe = { m: CategorizationMicrobe; poolMs: CategorizationMicrobe[] }

  const columnsPhase2: { title: string; badge: string; items: ColumnMicrobe[] }[] = [
    {
      title: site1Label,
      badge: "Microbes Categorized",
      items: p2Buckets.bucket1.map((m) => ({ m, poolMs: phaseContext.pool.microbes })),
    },
    ...(isLastSite
      ? []
      : [
          {
            title: site2Label,
            badge: "Microbes Categorized",
            items: p2Buckets.bucket2.map((m) => ({ m, poolMs: phaseContext.pool.microbes })),
          },
        ]),
    {
      title: "Return",
      badge: "Microbes Returned",
      items: p2Buckets.bucket3.map((m) => ({ m, poolMs: phaseContext.pool.microbes })),
    },
  ]

  const p0Keep = phase0Site2Results.filter((r) => r.confirmed).map((r) => r.microbe)
  const p0DiscardSite2 = phase0Site2Results.filter((r) => !r.confirmed).map((r) => r.microbe)
  const p0Keep3 = phase0Site3Results.filter((r) => r.confirmed).map((r) => r.microbe)
  const p0DiscardSite3 = phase0Site3Results.filter((r) => !r.confirmed).map((r) => r.microbe)

  const columnsPhase0: { title: string; badge: string; items: ColumnMicrobe[] }[] =
        currentPhase === "p2_site0_site2"
      ? [
          {
            title: site1Label,
            badge: "Confirmed",
            items: p0Keep.map((m) => ({ m, poolMs: site1Pool.microbes })),
          },
          {
            title: "Return",
            badge: "Discarded",
            items: p0DiscardSite2.map((m) => ({ m, poolMs: site1Pool.microbes })),
          },
        ]
      : [
          {
            title: site1Label,
            badge: "Confirmed",
            items: p0Keep3.map((m) => ({ m, poolMs: site2Pool.microbes })),
          },
          {
            title: "Return",
            badge: "Discarded",
            items: p0DiscardSite3.map((m) => ({ m, poolMs: site2Pool.microbes })),
          },
        ]

  const columns = isPhase0 ? columnsPhase0 : columnsPhase2

  return (
    <div className="relative h-screen w-full overflow-auto bg-gradient-to-br from-[#4ECDC4] to-[#2BA8A0]">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 h-48 w-32 rounded-lg bg-orange-500/30" />
        <div className="absolute top-32 left-60 h-32 w-20 rounded-lg bg-blue-400/30" />
        <div className="absolute right-40 bottom-40 h-24 w-40 rounded-lg bg-red-400/30" />
        <div className="absolute bottom-20 left-40 h-16 w-24 rounded bg-yellow-500/30" />
      </div>

      <div className="absolute top-0 right-0 left-0 z-20 flex h-14 items-center justify-between bg-[rgba(20,30,50,0.9)] px-6">
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((n, idx) => {
            const completed = activeSiteDot > n
            const active = activeSiteDot === n
            const dotClass = completed ? "bg-emerald-500" : active ? "bg-blue-500" : "border-2 border-gray-500 bg-transparent"
            const labelClass = completed || active ? "text-white" : "text-gray-400"
            return (
              <div key={n} className="flex items-center">
                {idx > 0 ? <div className="mx-1 h-0.5 w-6 bg-gray-600" aria-hidden /> : null}
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 shrink-0 rounded-full ${dotClass}`}
                    title={completed ? "Completed" : active ? "Current site" : "Upcoming"}
                  />
                  <span className={`text-sm ${labelClass}`}>Site {n}</span>
                </div>
              </div>
            )
          })}
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
          {isPhase0 ? (
            <>
              <span className="font-semibold">You have full site information available.</span> Reassess the microbes you
              reserved and decide which to retain.
            </>
          ) : (
            <>
              <span className="font-semibold">Evaluate each microbe</span> against the available site data and assign it
              to the most appropriate destination.
            </>
          )}
        </p>
        <button type="button" className="flex cursor-pointer items-center gap-2 text-blue-400 hover:text-blue-300">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
            <HelpCircle className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm">Help</span>
        </button>
      </div>

      <div className="absolute top-20 right-6 z-10 w-[15rem] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg bg-[#FFF9C4] p-4 shadow-lg">
        <h3 className="mb-2 text-sm font-bold text-gray-800 uppercase">
          Site {phaseContext.currentSiteNum} Information
        </h3>
        <p className="mb-3 text-xs font-medium text-gray-700">{phaseContext.scenarioLabel}</p>
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
        <div className={isPhase0 ? "" : "mb-3"}>
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
        {phaseContext.showInsight && phaseContext.revealed && phaseContext.nextReq ? (
          <div className="border-t border-amber-200/80 pt-3">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-800">
              Site {phaseContext.currentSiteNum + 1} Insight
            </h4>
            <p className="text-xs font-medium text-gray-600">{revealedTypeLabel(phaseContext.revealed)}</p>
            <p className="text-sm font-semibold text-gray-800">{formatRevealedLine(phaseContext.revealed)}</p>
          </div>
        ) : null}
      </div>

      <div className="relative z-10 mx-auto mt-[4.5rem] mb-4 flex min-h-0 w-[min(900px,calc(100%-18rem))] gap-6 rounded-2xl border border-white/30 bg-white/95 p-5 shadow-xl backdrop-blur-sm">
        <div className="flex w-[220px] shrink-0 flex-col">
          <div className="mb-2 flex flex-wrap items-baseline gap-2">
            <h2 className="text-lg font-bold text-gray-900">{isPhase0 ? "Review Microbes" : "Categorize Microbes"}</h2>
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
              <SlotAttributeRow Mobility={displayedMicrobe.Mobility} Agility={displayedMicrobe.Agility} Size={displayedMicrobe.Size} />
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
          {isPhase0 ? (
            <div className="flex shrink-0 flex-col gap-2">
              <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-gray-800">
                <input
                  type="radio"
                  name="p0cat"
                  checked={p0Selected === "keep"}
                  onChange={() => setP0Selected("keep")}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span className="min-w-0 break-words">{site1Label}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="p0cat"
                  checked={p0Selected === "discard"}
                  onChange={() => setP0Selected("discard")}
                  className="h-4 w-4"
                />
                Return
              </label>
            </div>
          ) : (
            <div className="flex shrink-0 flex-col gap-2">
              <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-gray-800">
                <input
                  type="radio"
                  name="p2cat"
                  checked={p2Selected === "site1"}
                  onChange={() => setP2Selected("site1")}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span className="min-w-0 break-words">{site1Label}</span>
              </label>
              {isLastSite ? null : (
                <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-gray-800">
                  <input
                    type="radio"
                    name="p2cat"
                    checked={p2Selected === "site2"}
                    onChange={() => setP2Selected("site2")}
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span className="min-w-0 break-words">{site2Label}</span>
                </label>
              )}
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="p2cat"
                  checked={p2Selected === "return"}
                  onChange={() => setP2Selected("return")}
                  className="h-4 w-4"
                />
                Return
              </label>
            </div>
          )}

          <button
            type="button"
            disabled={
              !displayedMicrobe ||
              (isPhase0 ? p0Selected === null : p2Selected === null)
            }
            onClick={isPhase0 ? handleSubmitP0 : handleSubmitP2}
            className={`mt-4 w-full shrink-0 rounded-lg py-3 text-sm font-semibold transition-colors ${
              displayedMicrobe && (isPhase0 ? p0Selected !== null : p2Selected !== null)
                ? "cursor-pointer bg-[rgba(20,30,50,0.9)] text-white hover:bg-[rgba(30,40,60,0.95)]"
                : "cursor-not-allowed bg-gray-300 text-gray-500"
            }`}
          >
            Submit Selection
          </button>
        </div>

        <div className="flex min-w-0 flex-1 gap-3">
          {columns.map((colDef) => (
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
                          <span className="flex shrink-0 scale-90">{collapsedBlobFromPool(m, poolMs)}</span>
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

      {scenariosFile ? (
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
      ) : null}
    </div>
  )
}
