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

type ChartPoint = GameResultRow & { x: number; y: number }

function pct(n: number | null | undefined, digits = 1) {
  if (n == null || Number.isNaN(n)) return "—"
  return `${n.toFixed(digits)}%`
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

function BreakdownTable({ r }: { r: GameResultRow }) {
  const rows = [
    { label: "Overall", value: pct(r.global_score) },
    { label: "Phase 1 avg", value: pct(r.phase1_avg) },
    { label: "Phase 2 avg", value: pct(r.phase2_avg) },
    { label: "Phase 0 avg", value: pct(r.phase0_avg) },
    { label: "Phase 3 avg", value: pct(r.phase3_avg) },
    { label: "Phase 4 avg", value: pct(r.phase4_avg) },
    { label: "Site 1", value: r.site1_scenario ? `${pct(r.site1_score)} · ${r.site1_scenario}` : pct(r.site1_score) },
    { label: "Site 2", value: r.site2_scenario ? `${pct(r.site2_score)} · ${r.site2_scenario}` : pct(r.site2_score) },
    { label: "Site 3", value: r.site3_scenario ? `${pct(r.site3_score)} · ${r.site3_scenario}` : pct(r.site3_score) },
    { label: "Time", value: formatDuration(r.time_taken) },
  ]
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-border last:border-0">
            <td className="py-2 pr-4 font-medium text-muted-foreground">{row.label}</td>
            <td className="py-2 text-right text-foreground">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
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
        avgTime: null as number | null,
      }
    }
    const scores = initialResults.map((r) => Number(r.global_score))
    const best = Math.max(...scores)
    const average = scores.reduce((a, b) => a + b, 0) / scores.length
    const avgTime = initialResults.reduce((a, r) => a + r.time_taken, 0) / initialResults.length
    return { count: initialResults.length, best, average, avgTime }
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                fill="hsl(var(--primary))"
                shape={(props: unknown) => {
                  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: ChartPoint }
                  if (cx == null || cy == null || !payload) return <g />
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={7}
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
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
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>Run breakdown</SheetTitle>
                <SheetDescription>{new Date(selected.played_at).toLocaleString()}</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <BreakdownTable r={selected} />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
