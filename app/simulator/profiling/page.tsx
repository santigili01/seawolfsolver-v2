"use client"

/**
 * Phase 1 — Build Microbe Profile (Seawolf Step 1).
 * Visual shell copied from app/simulator/page.tsx; panel layout per spec.
 */

import { useCallback, useEffect, useState, type ReactNode } from "react"
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

type SelectionItem = {
  type: "attribute" | "trait"
  name: string
  selectedMin?: number
  selectedMax?: number
}

const ATTR_NAMES = ["Mobility", "Agility", "Size"] as const

const TIMER_START = 30 * 60

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

function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")} min`
}

function isExtremeRange(min: number, max: number): boolean {
  return min <= 3 || max >= 8
}

function attrSpanWidth(min: number, max: number): number {
  return max - min + 1
}

/** Optimal 2 picks: extreme attrs (narrower width first), else desired trait + narrowest attr. */
function computeOptimalSelection(scenario: ScenarioRequirements): SelectionItem[] {
  const extreme = ATTR_NAMES.filter((n) =>
    isExtremeRange(scenario.attributes[n].min, scenario.attributes[n].max),
  )
    .map((n) => ({
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
    return [{ type: "attribute", name: extreme[0]!.name }, { type: "trait", name: scenario.desired_trait }]
  }

  const rest = ATTR_NAMES.map((n) => ({
    type: "attribute" as const,
    name: n,
    width: attrSpanWidth(scenario.attributes[n].min, scenario.attributes[n].max),
  })).sort((a, b) => a.width - b.width)

  return [{ type: "trait", name: scenario.desired_trait }, { type: "attribute", name: rest[0]!.name }]
}

function selectionKey(type: "attribute" | "trait", name: string) {
  return `${type}:${name}`
}

/** Start index of movable 3-value window on 1–10; valid stops 1–8 (covers 8–10 at max). */
function clampSliderStart(value: number): number {
  return Math.min(8, Math.max(1, Math.round(value)))
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
            style={{
              left: `${leftPct + widthPct / 2 - 2}%`,
            }}
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

export default function ProfilingSimulatorPage() {
  const [bootState, setBootState] = useState<"loading" | "ready" | "error">("loading")
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [scenariosFile, setScenariosFile] = useState<ScenariosFile | null>(null)
  const [scenario, setScenario] = useState<ScenarioRequirements | null>(null)

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set())
  const [phase, setPhase] = useState<"play" | "complete">("play")
  const [playerSelection, setPlayerSelection] = useState<SelectionItem[]>([])
  const [scenarioName, setScenarioName] = useState<string>("")
  const [optimalSelection, setOptimalSelection] = useState<SelectionItem[]>([])

  const [timeRemaining, setTimeRemaining] = useState(TIMER_START)
  const [keyExpanded, setKeyExpanded] = useState(false)

  const [sliderPositions, setSliderPositions] = useState<Record<string, number>>({
    Mobility: 1,
    Agility: 1,
    Size: 1,
  })

  const loadData = useCallback(async () => {
    setBootState("loading")
    setFetchError(null)
    try {
      const res = await fetch("/scenarios.json")
      if (!res.ok) throw new Error(`Could not load scenarios (${res.status})`)
      const data = (await res.json()) as ScenariosFile
      if (!data.scenarios?.length) throw new Error("No scenarios in file")
      setScenariosFile(data)
      const pick = data.scenarios[Math.floor(Math.random() * data.scenarios.length)]!
      setScenario(pick)
      setSelectedKeys(new Set())
      setPhase("play")
      setPlayerSelection([])
      setScenarioName("")
      setOptimalSelection([])
      setTimeRemaining(TIMER_START)
      setBootState("ready")
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e))
      setBootState("error")
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    const t = setInterval(() => setTimeRemaining((s) => (s <= 0 ? 0 : s - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!scenario) return
    setSliderPositions({
      Mobility: clampSliderStart(scenario.attributes.Mobility.min),
      Agility: clampSliderStart(scenario.attributes.Agility.min),
      Size: clampSliderStart(scenario.attributes.Size.min),
    })
  }, [scenario])

  const progressPercent = (timeRemaining / TIMER_START) * 100

  const handleSliderChange = useCallback((name: string, val: number) => {
    setSliderPositions((prev) => ({ ...prev, [name]: clampSliderStart(val) }))
  }, [])

  const toggleItem = (item: SelectionItem) => {
    const k = selectionKey(item.type, item.name)
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(k)) {
        next.delete(k)
        return next
      }
      if (next.size >= 2) return prev
      next.add(k)
      return next
    })
  }

  const submit = () => {
    if (!scenario || selectedKeys.size !== 2) return
    const items = selectionFromKeys(selectedKeys, sliderPositions)
    setPlayerSelection(items.slice(0, 2))
    setScenarioName(scenario.name)
    setOptimalSelection(computeOptimalSelection(scenario))
    setPhase("complete")
  }

  const keyTraits = scenariosFile?.traits ?? []
  const traitList = scenariosFile?.traits ?? []

  function selectionFromKeys(keys: Set<string>, positions: Record<string, number>): SelectionItem[] {
    const out: SelectionItem[] = []
    for (const n of ATTR_NAMES) {
      const kk = selectionKey("attribute", n)
      if (keys.has(kk)) {
        const start = clampSliderStart(positions[n] ?? 1)
        out.push({
          type: "attribute",
          name: n,
          selectedMin: start,
          selectedMax: start + 2,
        })
      }
    }
    for (const t of traitList) {
      const kk = selectionKey("trait", t)
      if (keys.has(kk)) out.push({ type: "trait", name: t })
    }
    return out
  }

  if (bootState === "error" && fetchError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4">
        <p className="text-center text-gray-800">{fetchError}</p>
        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-6 text-sm font-medium text-white hover:bg-gray-800"
        >
          Retry
        </button>
      </div>
    )
  }

  if (bootState === "loading" || !scenario || !scenariosFile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f0faf9]">
        <div
          className="size-10 shrink-0 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600"
          role="status"
          aria-label="Loading"
        />
        <p className="text-sm text-gray-600">Loading profile…</p>
      </div>
    )
  }

  if (phase === "complete") {
    return (
      <div
        className="relative flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-[#4ECDC4] to-[#2BA8A0] px-4"
        data-profiling-complete
        data-scenario-name={scenarioName}
        data-player-selection={JSON.stringify(playerSelection)}
        data-optimal-selection={JSON.stringify(optimalSelection)}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 h-48 w-32 rounded-lg bg-orange-500/30" />
          <div className="absolute bottom-20 right-40 h-24 w-40 rounded-lg bg-red-400/30" />
        </div>
        <h1 className="relative z-10 text-center text-3xl font-bold text-white md:text-4xl">Profile Complete!</h1>
        <p className="relative z-10 mt-2 text-center text-sm text-white/85">{scenarioName}</p>
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

  const req = scenario
  const canSubmit = selectedKeys.size === 2

  return (
    <div className="relative min-h-screen w-full overflow-auto bg-gradient-to-br from-[#4ECDC4] to-[#2BA8A0]">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 h-48 w-32 rounded-lg bg-orange-500/30" />
        <div className="absolute top-32 left-60 h-32 w-20 rounded-lg bg-blue-400/30" />
        <div className="absolute right-40 bottom-40 h-24 w-40 rounded-lg bg-red-400/30" />
        <div className="absolute bottom-20 left-40 h-16 w-24 rounded bg-yellow-500/30" />
      </div>

      <div className="absolute top-0 right-0 left-0 z-20 flex h-14 items-center justify-between bg-[rgba(20,30,50,0.9)] px-6">
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((n, idx) => {
            const active = n === 1
            const completed = false
            const dotClass = completed ? "bg-emerald-500" : active ? "bg-blue-500" : "border-2 border-gray-500 bg-transparent"
            const labelClass = completed || active ? "text-white" : "text-gray-400"
            return (
              <div key={n} className="flex items-center">
                {idx > 0 ? <div className="mx-1 h-0.5 w-6 bg-gray-600" aria-hidden /> : null}
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 shrink-0 rounded-full ${dotClass}`}
                    title={active ? "Current site" : "Upcoming"}
                  />
                  <span className={`text-sm ${labelClass}`}>Site {n}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col items-center">
          <span className="text-sm tabular-nums text-white">Time remaining: {formatCountdown(timeRemaining)}</span>
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">P</div>
          <h2 className="font-bold text-white">Profile</h2>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm text-gray-400">Task Instructions</span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-white/90">
          Review the site requirements and select 2 characteristics that best match this location&apos;s needs.
        </p>
        <button type="button" className="flex cursor-pointer items-center gap-2 text-blue-400 hover:text-blue-300">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
            <HelpCircle className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm">Help</span>
        </button>
      </div>

      <div className="absolute top-20 right-6 z-10 w-[15rem] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg bg-[#FFF9C4] p-4 shadow-lg">
        <h3 className="mb-2 text-sm font-bold text-gray-800 uppercase">Site 1 Information</h3>
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

      <div className="relative z-10 mx-auto mt-[4.5rem] mb-4 w-[min(900px,calc(100%-18rem))] rounded-2xl border border-white/30 bg-white/95 p-5 shadow-xl backdrop-blur-sm">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Characteristics</h2>

        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-600">Attributes</p>
        <div className="mb-8 space-y-3">
          {ATTR_NAMES.map((name) => {
            const r = req.attributes[name]
            const k = selectionKey("attribute", name)
            const on = selectedKeys.has(k)
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
                    onSliderChange={handleSliderChange}
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
          {traitList.map((trait) => {
            const k = selectionKey("trait", trait)
            const on = selectedKeys.has(k)
            const tc = traitColor(trait)
            return (
              <div
                key={trait}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${
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

        <div className="flex justify-center border-t border-gray-200 pt-5">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className={`min-w-[200px] rounded-lg px-10 py-3 text-sm font-semibold transition-colors ${
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
    </div>
  )
}
