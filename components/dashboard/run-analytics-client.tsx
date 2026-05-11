"use client"

import { useMemo, useState } from "react"
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { GameResultRow } from "@/lib/game-result-types"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { gameResultsScoreDisplayColorClass } from "@/components/game/GameResultsFull"

/** Brand teal used across Sea Wolf / practice surfaces */
const SEA_WOLF_TEAL = "#4ECDC4"
const CHART_POINT_OPACITY = 0.8

type ChartPoint = GameResultRow & { x: number; y: number }

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
          Combined average across all phases and sites for this session.
        </p>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-bold tracking-widest text-muted-foreground uppercase">Phase averages</h3>
        <p className="mb-3 text-xs text-muted-foreground">Percentage score averaged across the three sites.</p>
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
        <p className="mb-3 text-xs text-muted-foreground">Per-site composite score and scenario name.</p>
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
            <p className="mt-1 text-xs text-muted-foreground">Wall clock for the full run</p>
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{formatDuration(r.time_taken)}</p>
        </div>
      </section>
    </div>
  )
}

export function RunAnalyticsClient({ initialResults }: { initialResults: GameResultRow[] }) {
  const [selected, setSelected] = useState<GameResultRow | null>(null)

  const chartData: ChartPoint[] = useMemo(
    () =>
      initialResults.map((r) => ({
        ...r,
        x: new Date(r.played_at).getTime(),
        y: Number(r.global_score),
      })),
    [initialResults],
  )

  const summary = useMemo(() => {
    if (initialResults.length === 0) {
      return {
        count: 0,
        best: null as number | null,
        average: null as number | null,
        last5Average: null as number | null,
        last5SampleSize: 0,
        avgTime: null as number | null,
      }
    }
    const scores = initialResults.map((r) => Number(r.global_score))
    const best = Math.max(...scores)
    const average = scores.reduce((a, b) => a + b, 0) / scores.length
    const last5 = initialResults.slice(0, 5)
    const last5Scores = last5.map((r) => Number(r.global_score))
    const last5Average = last5Scores.reduce((a, b) => a + b, 0) / last5Scores.length
    const avgTime = initialResults.reduce((a, r) => a + r.time_taken, 0) / initialResults.length
    return {
      count: initialResults.length,
      best,
      average,
      last5Average,
      last5SampleSize: last5.length,
      avgTime,
    }
  }, [initialResults])

  const cardClass =
    "rounded-xl border border-border bg-card p-5 shadow-sm dark:bg-card/80"

  return (
    <div className="space-y-8 p-6 md:p-8">
      <div>
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">Analytics</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Run history</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Full-session scores from the Sea Wolf simulator. Hover points for a quick breakdown; click for details.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <div className={cardClass}>
          <p className="text-xs font-medium text-muted-foreground uppercase">Runs recorded</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{summary.count}</p>
        </div>
        <div className={cardClass}>
          <p className="text-xs font-medium text-muted-foreground uppercase">Best overall</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {summary.best != null ? `${summary.best.toFixed(1)}%` : "—"}
          </p>
        </div>
        <div className={cardClass}>
          <p className="text-xs font-medium text-muted-foreground uppercase">Historic average</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {summary.average != null ? `${summary.average.toFixed(1)}%` : "—"}
          </p>
        </div>
        <div className={cardClass}>
          <p className="text-xs font-medium text-muted-foreground uppercase">Last 5 runs avg</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {summary.last5Average != null ? `${summary.last5Average.toFixed(1)}%` : "—"}
          </p>
          {summary.last5SampleSize > 0 && summary.last5SampleSize < 5 ? (
            <p className="mt-2 text-xs leading-snug text-muted-foreground">Based on {summary.last5SampleSize} run(s)</p>
          ) : null}
        </div>
        <div className={cardClass}>
          <p className="text-xs font-medium text-muted-foreground uppercase">Avg. session time</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
            {summary.avgTime != null ? formatDuration(Math.round(summary.avgTime)) : "—"}
          </p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className={cn(cardClass, "py-12 text-center text-muted-foreground")}>
          No runs yet. Complete a full session at{" "}
          <a href="/practice/sea-wolf" className="font-medium text-primary underline">
            Practice → Sea Wolf
          </a>{" "}
          while signed in to see your scores here.
        </div>
      ) : (
        <div className={cn(cardClass, "min-h-[380px]")}>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Score over time</h2>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                type="number"
                dataKey="x"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(ts) => new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                className="text-xs text-muted-foreground"
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0, 100]}
                width={40}
                tickFormatter={(v) => `${v}`}
                className="text-xs text-muted-foreground"
                label={{ value: "Overall %", angle: -90, position: "insideLeft", className: "fill-muted-foreground text-xs" }}
              />
              <Tooltip content={<RunTooltip />} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter
                data={chartData}
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
            </ScatterChart>
          </ResponsiveContainer>
          <p className="mt-2 text-center text-xs text-muted-foreground">Click a point to open the full % breakdown.</p>
        </div>
      )}

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full gap-0 border-l border-border/60 bg-background/95 p-0 shadow-2xl backdrop-blur-md sm:max-w-md">
          {selected ? (
            <div className="flex h-full flex-col">
              <SheetHeader className="space-y-2 border-b border-border/60 bg-muted/30 px-6 py-6 text-left">
                <SheetTitle className="text-xl font-bold tracking-tight text-foreground">Run breakdown</SheetTitle>
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
