"use client"

import Link from "next/link"
import { createElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { BarChart2, Minus, TrendingDown, TrendingUp } from "lucide-react"
import {
  CartesianGrid,
  ComposedChart,
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

function RunTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  if (!active || !payload?.length) return null
  const r = payload[0]!.payload
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

  useEffect(() => {
    if (!selected) return
    if (normalizeRowGameType(selected) !== gameTypeFilter) setSelected(null)
  }, [gameTypeFilter, selected])

  const chartData: ChartPoint[] = useMemo(
    () =>
      filteredResults.map((r) => ({
        ...r,
        x: new Date(r.played_at).getTime(),
        y: Number(r.global_score),
      })),
    [filteredResults],
  )

  /** `null` = full time range (default). Set when user zooms with scroll wheel. */
  const [xZoomDomain, setXZoomDomain] = useState<[number, number] | null>(null)

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
  const chartWheelActive = hasAnyRuns && !filterEmpty

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
    if (filteredResults.length === 0) {
      return {
        count: 0,
        best: null as number | null,
        average: null as number | null,
        last5Average: null as number | null,
        last5SampleSize: 0,
        avgTime: null as number | null,
      }
    }
    const scores = filteredResults.map((r) => Number(r.global_score))
    const best = Math.max(...scores)
    const average = scores.reduce((a, b) => a + b, 0) / scores.length
    const last5 = filteredResults.slice(0, 5)
    const last5Scores = last5.map((r) => Number(r.global_score))
    const last5Average = last5Scores.reduce((a, b) => a + b, 0) / last5Scores.length
    const avgTime = filteredResults.reduce((a, r) => a + r.time_taken, 0) / filteredResults.length
    return {
      count: filteredResults.length,
      best,
      average,
      last5Average,
      last5SampleSize: last5.length,
      avgTime,
    }
  }, [filteredResults])

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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            <div className={cardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Best overall</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-600">
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
            <div className={cn(cardClass, "min-h-[380px]")}>
              <h2 className="mb-3 text-lg font-semibold text-foreground">Score progression</h2>
              <div
                ref={chartWrapperRef}
                className="relative h-[380px] w-full touch-pan-y"
                role="presentation"
                aria-label="Score chart — scroll to zoom the time axis"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart margin={{ top: 8, right: 48, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      domain={xAxisDomain}
                      allowDataOverflow={true}
                      tickFormatter={(ts) => new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
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
                        stroke="#718096"
                        strokeDasharray="4 4"
                        strokeOpacity={0.6}
                        isFront={false}
                        label={{
                          value: "Your avg",
                          position: "right",
                          className: "fill-muted-foreground text-xs",
                        }}
                      />
                    ) : null}
                    <Tooltip content={<RunTooltip />} cursor={{ strokeDasharray: "3 3" }} />
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
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Click a point to open the full % breakdown. Scroll on the chart to zoom the time axis; switching simulator
                resets the view.
              </p>
            </div>
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
