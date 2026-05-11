"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import type { Phase4Score } from "@/lib/game-scoring"
import type { Microbe, ScenarioRequirements, ScenariosFile } from "@/lib/game-types"
import { ATTR_NAMES, GRID_SLOTS } from "@/lib/game-types"
import { formatMmSs, randomPick } from "@/lib/game-helpers"
import { categorizeMicrobeForResults, getInviableAttributes } from "@/lib/game-helpers"
import {
  MicrobeAttributeRow,
  MicrobeSvgFor,
  SharedTopBar,
  SlotAttributeRow,
  Tooltip,
  TraitBadgeChip,
  assignUniqueSvgIndices,
} from "@/lib/game-visuals"
import { GamePhase4TreatmentPanel } from "@/components/game/GamePhase4TreatmentPanel"
import {
  buildGamePhase4Checklist,
  gameResultsOptimalScoreLineClass,
  gameResultsScoreDisplayColorClass,
  microbeResultKey,
} from "@/components/game/GameResultsFull"

type DifficultyTier = "beginner" | "intermediate" | "advanced" | "hadal"

type TreatmentPoolEntry = {
  pool_id: string
  max_score: number
  difficulty: string
  microbes: Microbe[]
}

type PoolsFile = Record<string, Partial<Record<DifficultyTier, TreatmentPoolEntry[]>>>

type Screen = "difficulty" | "game" | "results"

const DEFAULT_TRAITS = ["Biofilm-forming", "Thermophilic", "Metal-tolerant", "Halophobic"] as const

const DIFFICULTY_OPTIONS: {
  tier: DifficultyTier
  label: string
  description: string
}[] = [
  {
    tier: "beginner",
    label: "Beginner",
    description: "Lower difficulty score; the best trio is usually easier to spot.",
  },
  {
    tier: "intermediate",
    label: "Intermediate",
    description: "Balanced pools with more plausible wrong paths.",
  },
  {
    tier: "advanced",
    label: "Advanced",
    description: "Tighter tradeoffs and trickier attribute and trait traps.",
  },
  {
    tier: "hadal",
    label: "Hadal",
    description: "Hardest band — near-perfect reasoning under pressure.",
  },
]

/** Same outer shell as `/practice/sea-wolf` during an active session */
const SEA_WOLF_SESSION_BG =
  "relative min-h-screen bg-gradient-to-br from-[#4ECDC4] via-[#3EBDB5] to-[#2BA8A0]"

/** Standalone treatment session: one site, 10 minutes (full game is 3 sites, 30 min). */
const TREATMENT_SESSION_SECONDS = 10 * 60

const accentHeading = "border-l-4 border-[#4ECDC4] pl-3 text-lg font-bold text-[#1a202c]"

function difficultyBadgeClasses(tier: DifficultyTier): string {
  switch (tier) {
    case "beginner":
      return "bg-emerald-100 text-emerald-800"
    case "intermediate":
      return "bg-amber-100 text-amber-800"
    case "advanced":
      return "bg-orange-100 text-orange-800"
    case "hadal":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

function difficultyDisplayLabel(tier: DifficultyTier): string {
  return DIFFICULTY_OPTIONS.find((o) => o.tier === tier)?.label ?? tier
}

export function TreatmentSimulator() {
  const [screen, setScreen] = useState<Screen>("difficulty")
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("idle")
  const [loadError, setLoadError] = useState<string | null>(null)

  const [difficultyTier, setDifficultyTier] = useState<DifficultyTier | null>(null)
  const [scenarioName, setScenarioName] = useState<string | null>(null)
  const [selectedPool, setSelectedPool] = useState<TreatmentPoolEntry | null>(null)
  const [scenarioRequirements, setScenarioRequirements] = useState<ScenarioRequirements | null>(null)
  const [svgMap, setSvgMap] = useState<Map<string, number> | null>(null)
  const [traitsFile, setTraitsFile] = useState<string[]>([])
  const [attrListForKey, setAttrListForKey] = useState<string[]>(() => [...ATTR_NAMES])
  const [phase4Result, setPhase4Result] = useState<Phase4Score | null>(null)
  const [treatmentElapsedSeconds, setTreatmentElapsedSeconds] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(TREATMENT_SESSION_SECONDS)

  const gameStartedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (screen === "game") {
      gameStartedAtRef.current = Date.now()
    }
  }, [screen])

  useEffect(() => {
    if (screen !== "game") return
    const id = window.setInterval(() => {
      setTimeRemaining((t) => (t <= 0 ? 0 : t - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [screen])

  const resetAll = useCallback(() => {
    setScreen("difficulty")
    setLoadState("idle")
    setLoadError(null)
    setDifficultyTier(null)
    setScenarioName(null)
    setSelectedPool(null)
    setScenarioRequirements(null)
    setSvgMap(null)
    setTraitsFile([])
    setAttrListForKey([...ATTR_NAMES])
    setPhase4Result(null)
    setTreatmentElapsedSeconds(0)
    setTimeRemaining(TREATMENT_SESSION_SECONDS)
    gameStartedAtRef.current = null
  }, [])

  const handleDifficultySelect = useCallback(async (tier: DifficultyTier) => {
    setLoadState("loading")
    setLoadError(null)
    try {
      const [scenariosRes, poolsRes] = await Promise.all([
        fetch("/scenarios.json"),
        fetch("/pools.json"),
      ])
      if (!scenariosRes.ok) throw new Error("Could not load scenarios.")
      if (!poolsRes.ok) throw new Error("Could not load pools.")

      const scenariosFile = (await scenariosRes.json()) as ScenariosFile
      const pools = (await poolsRes.json()) as PoolsFile

      const scenarioKeys = Object.keys(pools).filter((name) => {
        const tierPools = pools[name]?.[tier]
        return Array.isArray(tierPools) && tierPools.length > 0
      })

      if (!scenarioKeys.length) {
        throw new Error(`No pools available for ${difficultyDisplayLabel(tier)}.`)
      }

      const pickedScenarioName = randomPick(scenarioKeys)
      const tierList = pools[pickedScenarioName]![tier]!
      const pool = randomPick(tierList)

      const scenario = scenariosFile.scenarios.find((s) => s.name === pickedScenarioName)
      if (!scenario) {
        throw new Error(`Missing scenario requirements for “${pickedScenarioName}”.`)
      }

      const microbes = pool.microbes.slice(0, GRID_SLOTS)
      if (microbes.length < GRID_SLOTS) {
        throw new Error("Pool does not contain enough microbes for treatment.")
      }

      const map = assignUniqueSvgIndices(microbes)

      setDifficultyTier(tier)
      setScenarioName(pickedScenarioName)
      setSelectedPool({ ...pool, microbes })
      setScenarioRequirements(scenario)
      setSvgMap(map)
      setTraitsFile(scenariosFile.traits)
      setAttrListForKey(scenariosFile.attributes?.length ? [...scenariosFile.attributes] : ATTR_NAMES.slice())
      setTimeRemaining(TREATMENT_SESSION_SECONDS)
      setScreen("game")
      setLoadState("idle")
    } catch (e) {
      setLoadState("error")
      setLoadError(e instanceof Error ? e.message : "Something went wrong.")
    }
  }, [])

  if (screen === "difficulty") {
    return (
      <div className={SEA_WOLF_SESSION_BG}>
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center text-white">
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Treatment Practice</h1>
        <p className="mb-10 max-w-md text-lg text-white/95">
          Select a difficulty to begin. You will have one Phase 4 round to find the optimal treatment combination.
        </p>

        {loadState === "loading" ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-white" aria-label="Loading" />
            <p className="text-sm text-white/90">Loading scenario…</p>
          </div>
        ) : null}

        {loadState === "error" ? (
          <div className="mb-8 max-w-md rounded-xl bg-[rgba(20,30,50,0.92)] px-6 py-4 text-left text-white shadow-lg">
            <p className="font-semibold text-red-300">Could not start</p>
            <p className="mt-1 text-sm text-white/90">{loadError}</p>
            <button
              type="button"
              className="mt-4 rounded-lg bg-[#4ECDC4] px-4 py-2 text-sm font-semibold text-[#1a202c] hover:opacity-90"
              onClick={() => {
                setLoadState("idle")
                setLoadError(null)
              }}
            >
              Retry
            </button>
          </div>
        ) : null}

        {loadState === "idle" ? (
          <div className="grid w-full max-w-lg gap-3 sm:grid-cols-2 sm:gap-4">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.tier}
                type="button"
                onClick={() => void handleDifficultySelect(opt.tier)}
                className="flex flex-col rounded-xl bg-[rgba(20,30,50,0.95)] px-5 py-4 text-left text-white shadow-lg transition hover:bg-[rgba(30,45,65,1)]"
              >
                <span className="text-lg font-bold">{opt.label}</span>
                <span className="mt-2 text-sm leading-snug text-white/85">{opt.description}</span>
              </button>
            ))}
          </div>
        ) : null}
        </div>
      </div>
    )
  }

  if (screen === "game" && selectedPool && scenarioRequirements && svgMap && difficultyTier !== null) {
    const progressPct = Math.min(100, Math.max(0, (timeRemaining / TREATMENT_SESSION_SECONDS) * 100))
    return (
      <div className={SEA_WOLF_SESSION_BG}>
        <SharedTopBar
          timeRemaining={timeRemaining}
          currentSiteHighlight={1}
          phaseLabel="Phase 4: Treatment"
          progressPercent={progressPct}
          sitesShown={1}
        />
        <GamePhase4TreatmentPanel
          key={selectedPool.pool_id}
          builtPool={selectedPool.microbes}
          svgMap={svgMap}
          scenario={scenarioRequirements}
          displaySiteNum={1}
          attributesListForKey={attrListForKey}
          scenariosFileTraits={traitsFile.length >= 4 ? traitsFile : [...DEFAULT_TRAITS]}
          onBehaviourData={() => {}}
          onComplete={(p4) => {
            const start = gameStartedAtRef.current
            const secs =
              start != null ? Math.max(0, Math.floor((Date.now() - start) / 1000)) : 0
            setTreatmentElapsedSeconds(secs)
            setPhase4Result(p4)
            setScreen("results")
          }}
        />
      </div>
    )
  }

  if (screen === "results" && phase4Result && scenarioRequirements && selectedPool && difficultyTier !== null) {
    const p4 = phase4Result
    const req = scenarioRequirements
    const pool = selectedPool.microbes
    const checklistRows = buildGamePhase4Checklist(p4, req)

    const sectionCard = "rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm"
    const statCard =
      "rounded-xl border border-[#e2e8f0] border-l-4 border-l-[#4ECDC4] bg-white p-5 text-center shadow-sm"

    const optimalMemberKeys = new Set(p4.optimalCombination.map((m) => microbeResultKey(m as Microbe)))
    const selectedKeys = new Set(p4.selectedMicrobes.map((m) => microbeResultKey(m as Microbe)))
    const playerKeysSorted = [...p4.selectedMicrobes]
      .map((m) => microbeResultKey(m as Microbe))
      .sort()
      .join("\0")
    const optimalKeysSorted = [...p4.optimalCombination]
      .map((m) => microbeResultKey(m as Microbe))
      .sort()
      .join("\0")
    const playerFoundOptimal =
      playerKeysSorted === optimalKeysSorted &&
      playerKeysSorted.length > 0 &&
      p4.selectedMicrobes.length === 3

    const scoreHuePct =
      p4.optimalScore > 0 ? Math.min(100, Math.round((p4.score / p4.optimalScore) * 100)) : Math.round(p4.percentage)

    const badgeBase =
      "absolute top-[-12px] z-10 whitespace-nowrap rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow"

    return (
      <div className="min-h-screen w-full bg-[#f8fffe] text-gray-900">
        <header className="fixed top-0 right-0 left-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 bg-[rgba(20,30,50,0.9)] px-4 sm:px-6">
          <div className="min-w-0 shrink">
            <h1 className="truncate text-lg font-bold text-white sm:text-xl">Treatment Complete!</h1>
            <p className="truncate text-[11px] text-white/70 sm:text-xs">
              Site 1 · {scenarioName ?? req.name}
              <span className="mx-1.5 text-white/40">·</span>
              <span className={`rounded-full px-2 py-0.5 font-semibold ${difficultyBadgeClasses(difficultyTier)}`}>
                {difficultyDisplayLabel(difficultyTier)}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#4ECDC4] px-4 text-sm font-semibold text-[#1a202c] transition-opacity hover:opacity-90 sm:px-5"
            >
              Play Again
            </button>
            <Link
              href="/practice"
              className="inline-flex h-10 items-center justify-center rounded-lg border-2 border-white bg-transparent px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:px-5"
            >
              Back to Practice
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 pb-12 pt-[calc(3.5rem+1rem)] sm:px-6 lg:px-8">
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <div className={statCard}>
              <p className="text-sm font-medium text-gray-500">Treatment Score</p>
              <p className={`mt-1 text-3xl font-bold tabular-nums sm:text-4xl ${gameResultsScoreDisplayColorClass(scoreHuePct)}`}>
                {p4.score}/{p4.optimalScore}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Vs. optimal max for this pool ·{" "}
                <span className={`font-semibold ${gameResultsScoreDisplayColorClass(Math.round(p4.percentage))}`}>
                  {Math.round(p4.percentage)}%
                </span>
              </p>
            </div>
            <div className={statCard}>
              <p className="text-sm font-medium text-gray-500">Time Spent</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-gray-800 sm:text-4xl">
                {formatMmSs(treatmentElapsedSeconds)}
              </p>
              <p className="mt-2 text-xs text-gray-500">Phase 4 session only</p>
            </div>
          </div>

          <div className={`${sectionCard} mb-6`}>
            <h2 className={`mb-4 ${accentHeading}`}>Conditions</h2>
            <ul className="flex flex-col gap-1 rounded-xl border border-[#e2e8f0] bg-[#f8fffe] p-3">
              {checklistRows.map((row) => (
                <li
                  key={row.label}
                  className={`flex min-h-0 flex-col gap-0.5 rounded-lg border px-2 py-1 sm:flex-row sm:items-center sm:gap-2 ${row.pass ? "border-[#e2e8f0] border-l-4 border-l-[#4ECDC4] bg-white" : "border-red-200 bg-red-50/50"}`}
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
                  <span className={`shrink-0 text-sm font-medium ${row.pass ? "text-emerald-600" : "text-red-600"}`}>
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

          <div className={`${sectionCard} mb-6`}>
            <h2 className={`mb-4 ${accentHeading}`}>Your selection</h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {(p4.selectedMicrobes as Microbe[]).map((raw) => {
                const m = raw
                const cat = categorizeMicrobeForResults(m, req)
                const badgeTone =
                  cat.category === "positive"
                    ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                    : cat.category === "negative"
                      ? "bg-red-100 text-red-800 ring-1 ring-red-200"
                      : "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
                const categoryLabel =
                  cat.category === "positive" ? "Positive" : cat.category === "negative" ? "Negative" : "Neutral"
                const inv = getInviableAttributes(m, req)
                const pass = cat.category !== "negative"
                return (
                  <div
                    key={m.id ?? microbeResultKey(m)}
                    className="flex min-w-[180px] flex-1 basis-[calc(33.333%-0.5rem)] flex-col rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-base font-bold text-[#1a202c]">{m.name ?? "Microbe"}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${pass ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
                        aria-label={pass ? "Pass" : "Fail"}
                      >
                        {pass ? "PASS" : "FAIL"}
                      </span>
                    </div>
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

          <section>
            <h2 className={`mb-6 ${accentHeading}`}>🏆 Optimal Combination</h2>
            {playerFoundOptimal ? (
              <p className="mb-4 text-base font-semibold text-emerald-600">🎉 You found the optimal combination!</p>
            ) : null}
            <div className={`mx-auto overflow-visible ${sectionCard}`}>
              {/* pt reserves space for absolutely positioned badges (top-[-12px]); overflow-x-auto clips vertical overflow without padding */}
              <div className="mt-2 overflow-x-auto px-1 pt-5 pb-2">
                <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
                  {Array.from({ length: GRID_SLOTS }, (__, idx) => {
                    const m = pool[idx]
                    if (!m) {
                      return (
                        <div
                          key={`treatment-opt-empty-${idx}`}
                          className="min-h-[140px] w-full min-w-0 rounded-xl bg-gray-50"
                          aria-hidden
                        />
                      )
                    }
                    const isOptimalMicrobe = optimalMemberKeys.has(microbeResultKey(m))
                    const isPlayerSelected = selectedKeys.has(microbeResultKey(m))
                    return (
                      <div
                        key={m.id}
                        className={`relative z-0 flex min-h-[140px] w-full min-w-0 flex-col overflow-visible rounded-xl border-2 bg-white p-2 shadow-md ${
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
              </div>
              <p
                className={`mt-4 border-t border-[#e2e8f0] pt-4 text-lg tabular-nums ${gameResultsOptimalScoreLineClass(p4.score)}`}
              >
                Your score: {p4.score}/{p4.optimalScore}
              </p>
            </div>
          </section>

          {p4.optimalScore < 100 ? (
            <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-gray-500">
              Note: perfect scores (100) are not always achievable. The max possible score shown reflects the best achievable result for
              each pool.
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={`${SEA_WOLF_SESSION_BG} flex min-h-screen items-center justify-center`}>
      <Loader2 className="h-10 w-10 animate-spin text-white" aria-label="Loading" />
    </div>
  )
}
