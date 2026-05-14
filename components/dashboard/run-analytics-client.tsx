"use client"

import Link from "next/link"
import { createElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  BarChart2,
  Minus,
  Play,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react"
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { GameResultRow } from "@/lib/game-result-types"
import {
  GAME_RESULT_GAME_TYPES,
  gameResultGameTypeLabels,
  type GameResultGameType,
} from "@/lib/game-result-types"
import { normalizeRowGameType } from "@/lib/game-results-utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { gameResultsScoreDisplayColorClass } from "@/components/game/GameResultsFull"

/** Brand teal used across Sea Wolf / practice surfaces */
const SEA_WOLF_TEAL = "#4ECDC4"
const CHART_POINT_OPACITY = 0.8

function gameTypeLabel(t: string): string {
  return t in gameResultGameTypeLabels
    ? gameResultGameTypeLabels[t as GameResultGameType]
    : t
}

type ChartPoint = GameResultRow & { x: number; y: number }

/** Narrowest time window when zoomed in (2 hours). */
const MIN_ZOOM_SPAN_MS = 6 * 60 * 60 * 1000

function chartTimeBounds(points: ChartPoint[]): { min: number; max: number; span: number } {
  if (points.length === 0) return { min: 0, max: 1, span: 1 }
  const xs = points.map((p) => p.x)
  let min = Math.min(...xs)
  let max = Math.max(...xs)
  if (min === max) {
    const pad = 86_400_000
    min -= pad
    max += pad
  }
  const rawSpan = max - min
  const pad = rawSpan * 0.02
  return { min: min - pad, max: max + pad, span: rawSpan + pad * 2 }
}

/** Minimal point for trend math (x = ms, y = score 0–100). */
type TrendRun = { x: number; y: number }

type TrendSession = {
  x: number
  y: number
  count: number
}

function clusterIntoSessions(runs: TrendRun[]): TrendSession[] {
  if (runs.length === 0) return []

  const sorted = [...runs].sort((a, b) => a.x - b.x)
  const THREE_HOURS = 3 * 60 * 60 * 1000
  const sessions: TrendRun[][] = []
  let currentSession: TrendRun[] = [sorted[0]!]

  for (let i = 1; i < sorted.length; i++) {
    const timeSinceSessionStart = sorted[i]!.x - currentSession[0]!.x
    if (timeSinceSessionStart <= THREE_HOURS) {
      currentSession.push(sorted[i]!)
    } else {
      sessions.push(currentSession)
      currentSession = [sorted[i]!]
    }
  }
  sessions.push(currentSession)

  return sessions.map((session) => ({
    x: session.reduce((s, r) => s + r.x, 0) / session.length,
    y: session.reduce((s, r) => s + r.y, 0) / session.length,
    count: session.length,
  }))
}

function linearRegression(points: { x: number; y: number }[]): (x: number) => number {
  const n = points.length
  if (n < 2) return () => points[0]?.y ?? 0

  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0)

  const denom = n * sumXX - sumX * sumX
  if (Math.abs(denom) < 1e-12) return () => sumY / n

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  return (x: number) => slope * x + intercept
}

/** Quadratic on normalized x; returns y in score units (clamp at call site). */
function polynomialRegression(points: { x: number; y: number }[]): (x: number) => number {
  const n = points.length
  if (n < 3) return linearRegression(points)

  const minX = Math.min(...points.map((p) => p.x))
  const maxX = Math.max(...points.map((p) => p.x))
  const rangeX = maxX - minX || 1

  const normalized = points.map((p) => ({
    x: (p.x - minX) / rangeX,
    y: p.y,
  }))

  let s00 = 0
  let s01 = 0
  let s02 = 0
  let s11 = 0
  let s12 = 0
  let s22 = 0
  let t0 = 0
  let t1 = 0
  let t2 = 0

  for (const p of normalized) {
    const x = p.x
    const x2 = x * x
    const x3 = x2 * x
    const x4 = x2 * x2
    s00 += 1
    s01 += x
    s02 += x2
    s11 += x2
    s12 += x3
    s22 += x4
    t0 += p.y
    t1 += x * p.y
    t2 += x2 * p.y
  }

  const det =
    s00 * (s11 * s22 - s12 * s12) - s01 * (s01 * s22 - s12 * s02) + s02 * (s01 * s12 - s11 * s02)

  if (Math.abs(det) < 1e-10) return linearRegression(points)

  const det0 =
    t0 * (s11 * s22 - s12 * s12) - s01 * (t1 * s22 - s12 * t2) + s02 * (t1 * s12 - s11 * t2)
  const det1 =
    s00 * (t1 * s22 - s12 * t2) - t0 * (s01 * s22 - s12 * s02) + s02 * (s01 * t2 - t1 * s02)
  const det2 =
    s00 * (s11 * t2 - t1 * s12) - s01 * (s01 * t2 - t1 * s02) + t0 * (s01 * s12 - s11 * s02)

  const c0 = det0 / det
  const c1 = det1 / det
  const c2 = det2 / det

  return (x: number) => {
    const xn = (x - minX) / rangeX
    return c0 + c1 * xn + c2 * xn * xn
  }
}

function generateTrendPoints(runs: TrendRun[]): { x: number; y: number }[] | null {
  if (runs.length < 2) return null

  const sessions = clusterIntoSessions(runs)
  if (sessions.length < 2) return null

  const regFn =
    sessions.length >= 10 ? polynomialRegression(sessions) : linearRegression(sessions)

  const minX = Math.min(...runs.map((r) => r.x))
  const maxX = Math.max(...runs.map((r) => r.x))
  const span = maxX - minX || 1

  return Array.from({ length: 50 }, (_, i) => {
    const x = minX + span * (i / 49)
    const y = Math.min(100, Math.max(0, regFn(x)))
    return { x, y }
  })
}

function pct(n: number | null | undefined, digits = 1) {
  if (n == null || Number.isNaN(n)) return "—"
  return `${n.toFixed(digits)}%`
}

function scoreTone(score: number | null | undefined) {
  if (score == null || Number.isNaN(score)) {
    return {
      chip: "bg-muted/80 text-muted-foreground ring-1 ring-border/60",
      text: "text-muted-foreground",
    }
  }
  if (score >= 80) {
    return {
      chip: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80 dark:bg-emerald-950/70 dark:text-emerald-100 dark:ring-emerald-800/60",
      text: "text-emerald-600 dark:text-emerald-400",
    }
  }
  if (score >= 60) {
    return {
      chip: "bg-amber-100 text-amber-950 ring-1 ring-amber-200/80 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-800/50",
      text: "text-amber-600 dark:text-amber-400",
    }
  }
  return {
    chip: "bg-red-100 text-red-900 ring-1 ring-red-200/80 dark:bg-red-950/60 dark:text-red-100 dark:ring-red-900/50",
    text: "text-red-600 dark:text-red-400",
  }
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function localDayKey(d: Date) {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, "0")
  const da = String(d.getDate()).padStart(2, "0")
  return `${y}-${mo}-${da}`
}

/** Consecutive calendar days with ≥1 run, allowing “today” to be skipped if you ran yesterday. */
function computeStreakFromRuns(runs: GameResultRow[]): number {
  if (runs.length === 0) return 0
  const keys = new Set<string>()
  for (const r of runs) {
    keys.add(localDayKey(new Date(r.played_at)))
  }
  const now = new Date()
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let k = localDayKey(cursor)
  if (!keys.has(k)) {
    cursor.setDate(cursor.getDate() - 1)
    k = localDayKey(cursor)
    if (!keys.has(k)) return 0
  }
  let streak = 0
  while (keys.has(localDayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

type DateRangeKey = "7d" | "30d" | "90d" | "all"

function applyDateRange(results: GameResultRow[], range: DateRangeKey): GameResultRow[] {
  if (range === "all") return results
  const now = Date.now()
  const ms = range === "7d" ? 7 * 86_400_000 : range === "30d" ? 30 * 86_400_000 : 90 * 86_400_000
  const cutoff = now - ms
  return results.filter((r) => new Date(r.played_at).getTime() >= cutoff)
}

function formatRunTableDate(iso: string) {
  const d = new Date(iso)
  const datePart = d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
  const timePart = d
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .replace(/\s/g, "")
    .toLowerCase()
  return `${datePart} · ${timePart}`
}

function meanPhase3Pct(runs: GameResultRow[]): number | null {
  const vals = runs
    .map((r) => r.phase3_avg)
    .filter((v): v is number => v != null && !Number.isNaN(Number(v)))
    .map(Number)
  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

type NextAction =
  | { priority: 1 }
  | { priority: 2; daysSince: number }
  | { priority: 3; phase3Avg: number }
  | { priority: 4; diffPct: string }
  | { priority: 5 }

const nextActionCardClass =
  "flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm dark:bg-card/80"

function NextActionsCard({ action }: { action: NextAction }) {
  if (action.priority === 1) {
    return (
      <div className={nextActionCardClass}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Play className="size-5" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">Start your first run</p>
          <p className="text-sm text-muted-foreground">
            Complete a Sea Wolf simulation to start tracking your progress.
          </p>
          <Link href="/practice" className="mt-2 text-sm font-medium text-primary hover:underline">
            Start practicing →
          </Link>
        </div>
      </div>
    )
  }
  if (action.priority === 2) {
    return (
      <div className={nextActionCardClass}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-950/50 dark:text-amber-400">
          <RefreshCw className="size-5" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">Time to practice again</p>
          <p className="text-sm text-muted-foreground">
            Your last run was {action.daysSince} days ago. Consistent practice improves pattern recognition.
          </p>
          <Link href="/practice" className="mt-2 text-sm font-medium text-primary hover:underline">
            Start a run →
          </Link>
        </div>
      </div>
    )
  }
  if (action.priority === 3) {
    return (
      <div className={nextActionCardClass}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-950/50 dark:text-red-400">
          <Target className="size-5" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">Focus on Prospect Pool</p>
          <p className="text-sm text-muted-foreground">
            Your Phase 3 average is {action.phase3Avg.toFixed(1)}% — the lowest of your phases. This is where most
            candidates lose points.
          </p>
          <Link href="/practice" className="mt-2 text-sm font-medium text-primary hover:underline">
            Practice Phase 3 →
          </Link>
        </div>
      </div>
    )
  }
  if (action.priority === 4) {
    return (
      <div className={nextActionCardClass}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-400">
          <TrendingUp className="size-5" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">Keep the momentum going</p>
          <p className="text-sm text-muted-foreground">
            Your last 5 runs average {action.diffPct}% higher than your all-time average. You&apos;re improving.
          </p>
          <Link href="/practice" className="mt-2 text-sm font-medium text-primary hover:underline">
            Start a run →
          </Link>
        </div>
      </div>
    )
  }
  return (
    <div className={nextActionCardClass}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Zap className="size-5" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">Ready for another run?</p>
        <p className="text-sm text-muted-foreground">
          Regular practice builds pattern recognition. Try a new scenario.
        </p>
        <Link href="/practice" className="mt-2 text-sm font-medium text-primary hover:underline">
          Start a run →
        </Link>
      </div>
    </div>
  )
}

function RunTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  if (!active || !payload?.length) return null
  const r = payload[0]!.payload
  if (!("id" in r) || r.id == null) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-foreground">{new Date(r.played_at).toLocaleString()}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{gameTypeLabel(r.game_type)}</p>
      <p className="mt-1 text-muted-foreground">
        Overall: <span className="font-medium text-foreground">{pct(r.global_score, 1)}</span>
      </p>
      <p className="text-muted-foreground">
        Phases: P1 {pct(r.phase1_avg)} · P2 {pct(r.phase2_avg)} · P0 {pct(r.phase0_avg)} · P3 {pct(r.phase3_avg)} · P4{" "}
        {pct(r.phase4_avg)}
      </p>
      <p className="mt-0.5 text-muted-foreground">Time: {formatDuration(r.time_taken)}</p>
    </div>
  )
}

function ScoreRow({
  label,
  score,
  sublabel,
  dense,
}: {
  label: string
  score: number | null | undefined
  sublabel?: string | null
  dense?: boolean
}) {
  const tone = scoreTone(score)
  const pad = dense ? "py-3.5 px-4 sm:px-5" : "py-4 px-4 sm:px-5"
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-border/70 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        pad,
      )}
    >
      <div className="min-w-0 shrink pt-0.5">
        <p className="text-sm font-semibold tracking-tight text-foreground">{label}</p>
        {sublabel ? <p className="mt-1 text-xs leading-snug text-muted-foreground">{sublabel}</p> : null}
      </div>
      <div className="flex shrink-0 items-center justify-start sm:justify-end">
        <span
          className={cn(
            "inline-flex min-w-[4.25rem] items-center justify-center rounded-full px-3 py-1 text-sm font-bold tabular-nums tracking-tight",
            tone.chip,
          )}
        >
          {pct(score)}
        </span>
      </div>
    </div>
  )
}

function BreakdownPanel({ r }: { r: GameResultRow }) {
  const overall = Number(r.global_score)

  return (
    <div className="space-y-8">
      <section
        className={cn(
          "rounded-2xl border bg-gradient-to-br p-6 shadow-sm",
          "from-muted/40 via-background to-muted/20",
          "border-border/80 ring-1 ring-border/40",
        )}
      >
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Overall</p>
        <p
          className={cn(
            "mt-2 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl",
            gameResultsScoreDisplayColorClass(overall),
          )}
        >
          {pct(r.global_score)}
        </p>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {normalizeRowGameType(r) === "treatment"
            ? "Phase 4 treatment score for this single-site session (same % as site 1 below)."
            : "Combined average across all phases and sites for this session."}
        </p>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-bold tracking-widest text-muted-foreground uppercase">Phase averages</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          {normalizeRowGameType(r) === "treatment"
            ? "Treatment mode records phase 4 only; other phases are not applicable."
            : "Percentage score averaged across the three sites."}
        </p>
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card/50 shadow-sm">
          <ScoreRow label="Phase 1 — Profile" score={r.phase1_avg == null ? null : Number(r.phase1_avg)} dense />
          <ScoreRow label="Phase 2 — Categorize" score={r.phase2_avg == null ? null : Number(r.phase2_avg)} dense />
          <ScoreRow label="Phase 0 — Review" score={r.phase0_avg == null ? null : Number(r.phase0_avg)} dense />
          <ScoreRow label="Phase 3 — Prospect pool" score={r.phase3_avg == null ? null : Number(r.phase3_avg)} dense />
          <ScoreRow label="Phase 4 — Treatment" score={r.phase4_avg == null ? null : Number(r.phase4_avg)} dense />
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-bold tracking-widest text-muted-foreground uppercase">By site</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          {normalizeRowGameType(r) === "treatment"
            ? "Single site (site 1); sites 2–3 are not part of this mode."
            : "Per-site composite score and scenario name."}
        </p>
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card/50 shadow-sm">
          <ScoreRow label="Site 1" score={r.site1_score == null ? null : Number(r.site1_score)} sublabel={r.site1_scenario} dense />
          <ScoreRow label="Site 2" score={r.site2_score == null ? null : Number(r.site2_score)} sublabel={r.site2_scenario} dense />
          <ScoreRow label="Site 3" score={r.site3_score == null ? null : Number(r.site3_score)} sublabel={r.site3_scenario} dense />
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Session time</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {normalizeRowGameType(r) === "treatment"
                ? "Wall clock for the treatment session"
                : "Wall clock for the full run"}
            </p>
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{formatDuration(r.time_taken)}</p>
        </div>
      </section>
    </div>
  )
}

export function RunAnalyticsClient({ initialResults }: { initialResults: GameResultRow[] }) {
  const [selected, setSelected] = useState<GameResultRow | null>(null)

  const countsByType = useMemo(() => {
    const m: Record<GameResultGameType, number> = { sea_wolf: 0, treatment: 0, redrock: 0 }
    for (const r of initialResults) {
      m[normalizeRowGameType(r)] += 1
    }
    return m
  }, [initialResults])

  const [gameTypeFilter, setGameTypeFilter] = useState<GameResultGameType>("sea_wolf")
  const [dateRange, setDateRange] = useState<DateRangeKey>("all")
  const [progressionView, setProgressionView] = useState<"chart" | "list">("chart")
  const [showTrendLine, setShowTrendLine] = useState(true)
  const didInitGameType = useRef(false)
  const chartWrapperRef = useRef<HTMLDivElement>(null)
  const xBoundsRef = useRef({ min: 0, max: 1, span: 1 })
  const chartDataLengthRef = useRef(0)
  /** On first load, open the first game tab that has runs (avoids an empty default when there are no full Sea Wolf runs). */
  useEffect(() => {
    if (didInitGameType.current) return
    didInitGameType.current = true
    const firstWithData = GAME_RESULT_GAME_TYPES.find((t) => countsByType[t] > 0)
    if (firstWithData) setGameTypeFilter(firstWithData)
  }, [countsByType])

  const filteredResults = useMemo(
    () => initialResults.filter((r) => normalizeRowGameType(r) === gameTypeFilter),
    [initialResults, gameTypeFilter],
  )

  const dateRangeFiltered = useMemo(
    () => applyDateRange(filteredResults, dateRange),
    [filteredResults, dateRange],
  )

  const showDateFallbackNotice =
    dateRange !== "all" && filteredResults.length > 0 && dateRangeFiltered.length === 0

  const displayRuns = useMemo(() => {
    if (dateRange === "all") return filteredResults
    if (dateRangeFiltered.length === 0 && filteredResults.length > 0) return filteredResults
    return dateRangeFiltered
  }, [dateRange, dateRangeFiltered, filteredResults])

  /** `null` = full time range (default). Set when user zooms with scroll wheel. */
  const [xZoomDomain, setXZoomDomain] = useState<[number, number] | null>(null)

  useEffect(() => {
    if (!selected) return
    if (normalizeRowGameType(selected) !== gameTypeFilter) setSelected(null)
  }, [gameTypeFilter, selected])

  useEffect(() => {
    setXZoomDomain(null)
  }, [dateRange])

  useEffect(() => {
    setProgressionView("chart")
  }, [gameTypeFilter])

  const chartData: ChartPoint[] = useMemo(
    () =>
      displayRuns.map((r) => ({
        ...r,
        x: new Date(r.played_at).getTime(),
        y: Number(r.global_score),
      })),
    [displayRuns],
  )

  const trendModel = useMemo(() => {
    const runs: TrendRun[] = chartData.map((d) => ({ x: d.x, y: d.y }))
    const trendPoints = generateTrendPoints(runs)
    if (!trendPoints) return null
    const sessions = clusterIntoSessions(runs)
    return {
      trendPoints,
      sessionCount: sessions.length,
      usePolynomial: sessions.length >= 10,
    }
  }, [chartData])

  const xBounds = useMemo(() => chartTimeBounds(chartData), [chartData])

  useEffect(() => {
    setXZoomDomain(null)
  }, [gameTypeFilter])

  useEffect(() => {
    xBoundsRef.current = xBounds
  }, [xBounds])

  useEffect(() => {
    chartDataLengthRef.current = chartData.length
  }, [chartData])

  const hasAnyRuns = initialResults.length > 0
  const filterEmpty = hasAnyRuns && filteredResults.length === 0
  const chartWheelActive = hasAnyRuns && !filterEmpty && progressionView === "chart"

  useLayoutEffect(() => {
    if (!chartWheelActive) return
    const el = chartWrapperRef.current
    if (!el) return

    const handleWheel = (e: globalThis.WheelEvent) => {
      if (chartDataLengthRef.current === 0) return
      e.preventDefault()
      e.stopPropagation()

      const { min: dataMin, max: dataMax, span: fullSpan } = xBoundsRef.current
      const minSpan = MIN_ZOOM_SPAN_MS

      // Compute mouse anchor as a 0-1 fraction across the chart width
      // so zoom centers on cursor position, not window midpoint
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
      const chartLeftOffset = 40 // approximate YAxis width in px
      const chartWidth = rect.width - chartLeftOffset - 16 // subtract right margin
      const mouseX = e.clientX - rect.left - chartLeftOffset
      const anchorFraction = Math.max(0, Math.min(1, mouseX / chartWidth))

      setXZoomDomain((prev) => {
        const curLo = prev != null ? prev[0] : dataMin
        const curHi = prev != null ? prev[1] : dataMax
        const curSpan = curHi - curLo

        const factor = e.deltaY < 0 ? 0.72 : 1 / 0.72
        let newSpan = curSpan * factor
        newSpan = Math.max(newSpan, minSpan)
        newSpan = Math.min(newSpan, fullSpan * 1.001)

        // Reset to full range if span grows to full data span
        if (newSpan >= fullSpan * 0.999) return null

        // Anchor zoom to mouse position:
        // the time value under the cursor stays fixed as we zoom
        const anchorTime = curLo + anchorFraction * curSpan
        let nLo = anchorTime - anchorFraction * newSpan
        let nHi = anchorTime + (1 - anchorFraction) * newSpan

        // Allow the window to extend beyond data bounds so the user
        // can pan to empty space and see individual clusters clearly.
        // Only hard-clamp if the entire window is outside data range.
        if (nHi < dataMin) {
          nLo = dataMin
          nHi = dataMin + newSpan
        }
        if (nLo > dataMax) {
          nHi = dataMax
          nLo = dataMax - newSpan
        }

        return [nLo, nHi]
      })
    }

    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [chartWheelActive])

  const xAxisDomain = useMemo((): [number, number] => {
    if (chartData.length === 0) return [xBounds.min, xBounds.max]
    if (xZoomDomain == null) return [xBounds.min, xBounds.max]
    return [xZoomDomain[0], xZoomDomain[1]]
  }, [chartData, xBounds.min, xBounds.max, xZoomDomain])

  const yAxisDomainMin = useMemo(() => {
    if (chartData.length === 0) return 0
    const lowest = Math.min(...chartData.map((d) => d.y))
    return Math.max(0, Math.floor(lowest - 5))
  }, [chartData])

  const summary = useMemo(() => {
    if (displayRuns.length === 0) {
      return {
        count: 0,
        best: null as number | null,
        average: null as number | null,
        last5Average: null as number | null,
        last5SampleSize: 0,
        avgTime: null as number | null,
      }
    }
    const sortedNewestFirst = [...displayRuns].sort(
      (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime(),
    )
    const scores = sortedNewestFirst.map((r) => Number(r.global_score))
    const best = Math.max(...scores)
    const average = scores.reduce((a, b) => a + b, 0) / scores.length
    const last5 = sortedNewestFirst.slice(0, 5)
    const last5Scores = last5.map((r) => Number(r.global_score))
    const last5Average = last5Scores.reduce((a, b) => a + b, 0) / last5Scores.length
    const avgTime = displayRuns.reduce((a, r) => a + r.time_taken, 0) / displayRuns.length
    return {
      count: displayRuns.length,
      best,
      average,
      last5Average,
      last5SampleSize: last5.length,
      avgTime,
    }
  }, [displayRuns])

  const streakDays = useMemo(() => computeStreakFromRuns(displayRuns), [displayRuns])

  const runsChronological = useMemo(
    () =>
      [...displayRuns].sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime()),
    [displayRuns],
  )

  const tableBestScore = useMemo(() => {
    if (runsChronological.length === 0) return null
    return Math.max(...runsChronological.map((r) => Number(r.global_score)))
  }, [runsChronological])

  const nextAction = useMemo((): NextAction => {
    if (filteredResults.length === 0) return { priority: 1 }
    const byDesc = [...filteredResults].sort(
      (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime(),
    )
    const last = byDesc[0]!
    const daysSince = Math.floor((Date.now() - new Date(last.played_at).getTime()) / 86_400_000)
    if (daysSince > 2) return { priority: 2, daysSince }
    const p3 = meanPhase3Pct(displayRuns)
    if (p3 != null && p3 < 70) return { priority: 3, phase3Avg: p3 }
    if (
      summary.count >= 2 &&
      summary.last5Average != null &&
      summary.average != null &&
      summary.last5Average > summary.average + 0.5
    ) {
      return { priority: 4, diffPct: (summary.last5Average - summary.average).toFixed(1) }
    }
    return { priority: 5 }
  }, [filteredResults, displayRuns, summary])

  const trendSentence = useMemo(() => {
    if (summary.count < 5) return null
    const last5 = summary.last5Average
    const hist = summary.average
    if (last5 == null || hist == null) return null
    const diffUp = last5 - hist
    const diffDown = hist - last5
    if (Math.abs(last5 - hist) < 0.5) {
      return {
        icon: Minus,
        text: "Your scores are consistent — your last 5 runs match your historical average.",
        className: "text-muted-foreground",
      } as const
    }
    if (last5 > hist) {
      return {
        icon: TrendingUp,
        text: `Your score trend is increasing — your last 5 runs average ${diffUp.toFixed(1)}% higher than your historical average.`,
        className: "text-emerald-600",
      } as const
    }
    return {
      icon: TrendingDown,
      text: `Your score trend is decreasing — your last 5 runs average ${diffDown.toFixed(1)}% lower than your historical average.`,
      className: "text-amber-500",
    } as const
  }, [summary.average, summary.count, summary.last5Average])

  const cardClass =
    "rounded-xl border border-border bg-card p-5 shadow-sm dark:bg-card/80"

  return (
    <div className="space-y-8 p-6 md:p-8">
      <div className="min-w-0 max-w-2xl space-y-2">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">Analytics</p>
        <h1 className="text-3xl font-bold text-foreground">Your progress</h1>
        <p className="text-muted-foreground">
          Track your progress across every run.
          <br />
          Click any point to see the full phase breakdown.
        </p>
      </div>

      {!hasAnyRuns ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-20 text-center shadow-sm">
          <BarChart2 className="size-12 text-muted-foreground" aria-hidden />
          <h2 className="mt-6 text-xl font-semibold text-foreground">No runs recorded yet</h2>
          <p className="mt-2 max-w-md text-muted-foreground">Complete a Sea Wolf simulation to see your analytics.</p>
          <Button asChild variant="default" className="mt-6">
            <Link href="/practice">Start practicing →</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 text-sm text-muted-foreground">Simulator:</span>
            <div className="w-full max-w-[240px] min-w-0">
              <Select value={gameTypeFilter} onValueChange={(v) => setGameTypeFilter(v as GameResultGameType)}>
                <SelectTrigger
                  id="analytics-simulator"
                  size="default"
                  className={cn(
                    "h-11 w-full rounded-xl border bg-card px-3 text-sm font-medium text-foreground shadow-sm",
                    "border-blue-300/90 hover:border-blue-500 hover:bg-card",
                    "focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/25",
                    "dark:border-blue-800/70 dark:hover:border-blue-600 dark:hover:bg-card/90",
                    "dark:focus-visible:border-blue-500 dark:focus-visible:ring-blue-400/30",
                    "[&_svg]:text-blue-600 dark:[&_svg]:text-blue-400",
                  )}
                >
                  <SelectValue placeholder="Choose simulator" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="z-[60] border border-blue-200/80 bg-popover shadow-md dark:border-blue-900/60"
                >
                  {GAME_RESULT_GAME_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      <span className="flex w-full items-center justify-between gap-4">
                        <span>{gameResultGameTypeLabels[t]}</span>
                        <span className="tabular-nums text-muted-foreground">({countsByType[t]})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-row flex-wrap gap-2">
              {(["7d", "30d", "90d", "all"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDateRange(key)}
                  className={cn(
                    "cursor-pointer rounded-full px-3 py-1.5 text-sm transition-colors duration-150",
                    dateRange === key
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:border-foreground hover:text-foreground",
                  )}
                >
                  {key === "all" ? "All time" : key}
                </button>
              ))}
            </div>
            {showDateFallbackNotice ? (
              <p className="text-sm text-muted-foreground">
                No runs in this period — showing all time data instead
              </p>
            ) : null}
          </div>

          <NextActionsCard action={nextAction} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <div
              className={cn(
                "rounded-xl border p-5 shadow-sm",
                "border-[#1a202c] bg-[#1a202c] text-white dark:border-[#1a202c]",
              )}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-white/60">Best overall</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-400">
                {summary.best != null ? `${summary.best.toFixed(1)}%` : "—"}
              </p>
            </div>
            <div className={cardClass}>
              <p className="text-xs font-medium text-muted-foreground uppercase">Last 5 avg</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                {summary.last5Average != null ? `${summary.last5Average.toFixed(1)}%` : "—"}
              </p>
              {summary.last5SampleSize > 0 && summary.last5SampleSize < 5 ? (
                <p className="mt-2 text-xs leading-snug text-muted-foreground">Based on {summary.last5SampleSize} run(s)</p>
              ) : null}
            </div>
            <div className={cardClass}>
              <p className="text-xs font-medium text-muted-foreground uppercase">Historic average</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                {summary.average != null ? `${summary.average.toFixed(1)}%` : "—"}
              </p>
            </div>
            <div className={cardClass}>
              <p className="text-xs font-medium text-muted-foreground uppercase">Runs recorded</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{summary.count}</p>
            </div>
            <div className={cardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current streak</p>
              <p
                className={cn(
                  "mt-2 text-2xl font-bold tabular-nums",
                  streakDays >= 3 ? "text-emerald-600 dark:text-emerald-400" : streakDays === 0 ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {streakDays} days
              </p>
              {streakDays >= 1 ? (
                <p className="mt-2 text-xs text-muted-foreground">consecutive active days</p>
              ) : (
                <p className="mt-2 text-xs text-amber-500">practice today to start one</p>
              )}
            </div>
            <div className={cardClass}>
              <p className="text-xs font-medium text-muted-foreground uppercase">Avg. session time</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                {summary.avgTime != null ? formatDuration(Math.round(summary.avgTime)) : "—"}
              </p>
            </div>
          </div>

          {!filterEmpty && trendSentence ? (
            <div
              className={cn(
                "mb-4 flex items-center gap-2 text-sm font-medium",
                trendSentence.className,
              )}
            >
              {createElement(trendSentence.icon, {
                className: "size-4 shrink-0",
                "aria-hidden": true,
              })}
              <span>{trendSentence.text}</span>
            </div>
          ) : null}

          {filterEmpty ? (
            <div className={cn(cardClass, "py-12 text-center text-muted-foreground")}>
              <p className="font-medium text-foreground">No runs for {gameResultGameTypeLabels[gameTypeFilter]}</p>
              <p className="mt-2 text-sm">
                Pick another game above, or start a run for this mode from{" "}
                {gameTypeFilter === "treatment" ? (
                  <a href="/practice/sea-wolf-treatment" className="font-medium text-primary underline">
                    Practice → Treatment
                  </a>
                ) : gameTypeFilter === "redrock" ? (
                  <span className="text-foreground/80">the Redrock practice flow (coming soon)</span>
                ) : (
                  <a href="/practice/sea-wolf" className="font-medium text-primary underline">
                    Practice → Sea Wolf
                  </a>
                )}
                .
              </p>
            </div>
          ) : (
            <>
              <div className={cn(cardClass, progressionView === "chart" && "min-h-[410px]")}>
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Score progression</h2>
                  <div className="flex flex-wrap items-start justify-end gap-3 sm:gap-4">
                    {progressionView === "chart" && trendModel ? (
                      <div className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={() => setShowTrendLine((v) => !v)}
                          className={cn(
                            "rounded-full border border-border px-3 py-1.5 text-sm transition-colors duration-150",
                            showTrendLine
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:border-foreground hover:text-foreground",
                          )}
                        >
                          {showTrendLine
                            ? trendModel.usePolynomial
                              ? "Hide trend curve"
                              : "Hide trend line"
                            : trendModel.usePolynomial
                              ? "Show trend curve"
                              : "Show trend line"}
                        </button>
                        {showTrendLine ? (
                          <p className="text-right text-xs text-muted-foreground">
                            {trendModel.usePolynomial
                              ? `Polynomial fit · ${trendModel.sessionCount} sessions`
                              : `Linear fit · ${trendModel.sessionCount} sessions`}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="flex items-center rounded-md border border-border p-0.5">
                      <button
                        type="button"
                        onClick={() => setProgressionView("chart")}
                        className={cn(
                          "rounded px-3 py-1.5 text-sm transition-colors",
                          progressionView === "chart"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        Chart
                      </button>
                      <button
                        type="button"
                        onClick={() => setProgressionView("list")}
                        className={cn(
                          "rounded px-3 py-1.5 text-sm transition-colors",
                          progressionView === "list"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        List
                      </button>
                    </div>
                  </div>
                </div>
                {progressionView === "chart" ? (
                  <>
                    <div
                      className="flex h-[410px] w-full touch-pan-y flex-col"
                      role="presentation"
                      aria-label="Score chart — scroll to zoom the time axis"
                    >
                      <div ref={chartWrapperRef} className="relative min-h-0 flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart margin={{ top: 8, right: 48, bottom: 8, left: 0 }}>
                          <defs>
                            <linearGradient id="analyticsTrendStroke" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
                              <stop offset="0%" stopColor="#4ECDC4" />
                              <stop offset="100%" stopColor="#2563eb" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis
                            type="number"
                            dataKey="x"
                            domain={xAxisDomain}
                            allowDataOverflow={true}
                            tickFormatter={(ts) =>
                              new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                            }
                            className="text-xs text-muted-foreground"
                          />
                          <YAxis
                            type="number"
                            domain={[yAxisDomainMin, 100]}
                            width={40}
                            allowDataOverflow={true}
                            tickFormatter={(v) => `${v}`}
                            className="text-xs text-muted-foreground"
                            label={{
                              value: "Overall %",
                              angle: -90,
                              position: "insideLeft",
                              className: "fill-muted-foreground text-xs",
                            }}
                          />
                          {summary.average != null ? (
                            <ReferenceLine
                              y={summary.average}
                              stroke="#22c55e"
                              strokeDasharray="10 6"
                              strokeWidth={2.5}
                              strokeOpacity={1}
                              isFront={false}
                            />
                          ) : null}
                          {showTrendLine && trendModel ? (
                            <Line
                              type="monotone"
                              data={trendModel.trendPoints}
                              dataKey="y"
                              stroke="url(#analyticsTrendStroke)"
                              strokeWidth={2.5}
                              dot={false}
                              isAnimationActive={false}
                              connectNulls
                              name="trend"
                            />
                          ) : null}
                          <Scatter
                            data={chartData}
                            dataKey="y"
                            fill={SEA_WOLF_TEAL}
                            fillOpacity={CHART_POINT_OPACITY}
                            shape={(props: unknown) => {
                              const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: ChartPoint }
                              if (cx == null || cy == null || !payload) return <g />
                              return (
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={7}
                                  fill={SEA_WOLF_TEAL}
                                  fillOpacity={CHART_POINT_OPACITY}
                                  stroke="rgba(42, 168, 160, 0.55)"
                                  strokeWidth={1.5}
                                  className="cursor-pointer"
                                  onClick={() => setSelected(payload)}
                                />
                              )
                            }}
                          />
                          <Tooltip
                            cursor={{ strokeDasharray: "3 3" }}
                            content={(props) => {
                              if (!props.active || !props.payload?.length) return null
                              const pl = props.payload[0]?.payload as ChartPoint | undefined
                              if (!pl || !("id" in pl) || pl.id == null) return null
                              return <RunTooltip active={props.active} payload={props.payload as { payload: ChartPoint }[]} />
                            }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    {(summary.average != null || (showTrendLine && trendModel)) ? (
                      <div
                        className="flex shrink-0 flex-wrap items-center justify-end gap-x-5 gap-y-2 border-t border-border/50 bg-muted/15 px-2 py-2.5 dark:bg-muted/10"
                        role="list"
                        aria-label="Chart legend"
                      >
                        {summary.average != null ? (
                          <div className="flex items-center gap-2" role="listitem">
                            <svg width={36} height={10} viewBox="0 0 36 10" aria-hidden className="shrink-0">
                              <line
                                x1="0"
                                y1="5"
                                x2="36"
                                y2="5"
                                stroke="#22c55e"
                                strokeWidth={2.5}
                                strokeDasharray="8 5"
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="text-xs font-medium text-foreground">Your average</span>
                          </div>
                        ) : null}
                        {showTrendLine && trendModel ? (
                          <div className="flex items-center gap-2" role="listitem">
                            <div
                              className="h-1 w-9 shrink-0 rounded-full bg-gradient-to-r from-[#4ECDC4] to-[#2563eb]"
                              aria-hidden
                            />
                            <span className="text-xs font-medium text-foreground">Trend</span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    </div>
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      Click a point to open the full % breakdown. Scroll on the chart to zoom the time axis; switching
                      simulator resets the view.
                    </p>
                  </>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="whitespace-nowrap px-2 py-2 font-medium">#</th>
                          <th className="whitespace-nowrap px-2 py-2 font-medium">Date</th>
                          <th className="whitespace-nowrap px-2 py-2 font-medium">Overall Score</th>
                          <th className="whitespace-nowrap px-2 py-2 font-medium">Phase 1</th>
                          <th className="whitespace-nowrap px-2 py-2 font-medium">Phase 2</th>
                          <th className="whitespace-nowrap px-2 py-2 font-medium">Phase 3</th>
                          <th className="whitespace-nowrap px-2 py-2 font-medium">Phase 4</th>
                        </tr>
                      </thead>
                      <tbody>
                        {runsChronological.map((r, i) => {
                          const overall = Number(r.global_score)
                          const isBest = tableBestScore != null && overall === tableBestScore
                          const rowBg = i % 2 === 1 ? "bg-muted/20" : ""
                          const overallTone = scoreTone(overall).text
                          const phaseCell = (v: number | null) => {
                            if (v == null || Number.isNaN(Number(v))) {
                              return <span className="text-muted-foreground">—</span>
                            }
                            const n = Number(v)
                            return <span className={cn("font-semibold", scoreTone(n).text)}>{pct(n)}</span>
                          }
                          return (
                            <tr
                              key={r.id}
                              className={cn(
                                "border-b border-border/60",
                                rowBg,
                                isBest && "bg-emerald-50 dark:bg-emerald-950/30",
                              )}
                            >
                              <td className="whitespace-nowrap px-2 py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                              <td className="whitespace-nowrap px-2 py-2 text-foreground">{formatRunTableDate(r.played_at)}</td>
                              <td className={cn("whitespace-nowrap px-2 py-2 font-semibold tabular-nums", overallTone)}>
                                {pct(overall)}
                              </td>
                              <td className="whitespace-nowrap px-2 py-2 tabular-nums">{phaseCell(r.phase1_avg)}</td>
                              <td className="whitespace-nowrap px-2 py-2 tabular-nums">{phaseCell(r.phase2_avg)}</td>
                              <td className="whitespace-nowrap px-2 py-2 tabular-nums">{phaseCell(r.phase3_avg)}</td>
                              <td className="whitespace-nowrap px-2 py-2 tabular-nums">{phaseCell(r.phase4_avg)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <p className="mt-3 text-xs text-muted-foreground">{runsChronological.length} runs recorded</p>
                  </div>
                )}
              </div>

              {/* PLACEHOLDER: wire real platform aggregate when enough user data exists */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm dark:bg-card/80">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-foreground">How you compare</h3>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Beta</span>
                </div>
                <div className="relative mt-6">
                  <div className="h-3 w-full rounded-full bg-muted" />
                  {summary.average != null ? (
                    <div
                      className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-sm ring-2 ring-background"
                      style={{ left: `${Math.min(100, Math.max(0, summary.average))}%` }}
                      title={`Your historic average (${summary.average.toFixed(1)}%)`}
                    />
                  ) : null}
                  {/* PLACEHOLDER: 72% — replace with real platform avg when available */}
                  <div
                    className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4ECDC4] shadow-sm ring-2 ring-background"
                    style={{ left: "72%" }}
                    title="SeaWolfPrep users avg (placeholder)"
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>100%</span>
                </div>
                <ul className="mt-4 space-y-1.5 text-sm text-foreground">
                  <li className="flex items-center gap-2">
                    <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                    <span>
                      You ({summary.average != null ? `${summary.average.toFixed(1)}%` : "—"})
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-2 shrink-0 rounded-full bg-[#4ECDC4]" aria-hidden />
                    <span>SeaWolfPrep users avg (72%)</span>
                  </li>
                </ul>
                <p className="mt-3 text-xs italic text-muted-foreground">
                  Comparison data updates as more users complete runs. Currently showing estimated platform averages.
                </p>
              </div>
            </>
          )}
        </>
      )}

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full gap-0 border-l border-border/60 bg-background/95 p-0 shadow-2xl backdrop-blur-md sm:max-w-md">
          {selected ? (
            <div className="flex h-full flex-col">
              <SheetHeader className="space-y-2 border-b border-border/60 bg-muted/30 px-6 py-6 text-left">
                <SheetTitle className="text-xl font-bold tracking-tight text-foreground">Run breakdown</SheetTitle>
                <p className="text-left text-xs font-medium text-muted-foreground">
                  {gameTypeLabel(normalizeRowGameType(selected))}
                </p>
                <SheetDescription className="text-sm leading-relaxed text-muted-foreground">
                  {new Date(selected.played_at).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
                <BreakdownPanel r={selected} />
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
