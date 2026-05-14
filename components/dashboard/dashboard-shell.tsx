import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { BookOpen, Check, CheckSquare, FileText, Play, Square, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardHomeAnalytics } from "@/lib/dashboard-home-analytics"
import { cn } from "@/lib/utils"

function fmtPct(n: number | null) {
  if (n == null || Number.isNaN(n)) return "—"
  return `${n.toFixed(1)}%`
}

export function DashboardShell({
  firstName,
  analytics,
}: {
  firstName: string
  analytics: DashboardHomeAnalytics
}) {
  return (
    <main className="flex flex-col gap-6 p-6 sm:p-8">
      {/* Row 1: Welcome bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back, {firstName}.</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here&apos;s where you stand.</p>
        </div>
        <div className="flex shrink-0 justify-start sm:justify-end">
          {analytics.hasAnyRuns && analytics.lastRunGlobalScorePct != null ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
              </span>
              Last run: {fmtPct(analytics.lastRunGlobalScorePct)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No runs yet — start practicing below</p>
          )}
        </div>
      </div>

      {/* Row 2: Start Practice (dominant) + progress stats */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-5">
        <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card p-8 text-card-foreground shadow-sm lg:col-span-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ready to practice</p>
          <h2 className="mt-2 text-3xl font-bold text-foreground">Start a full Sea Wolf run</h2>
          <p className="mt-1 text-sm text-muted-foreground">30 minutes · 3 sites · All 4 phases</p>

          <div className="border-t border-[#4ECDC4]/30 my-6" aria-hidden />

          <div className="grid grid-cols-2 gap-0">
            <div className="border-border border-b border-r p-4">
              <p className="text-sm text-muted-foreground">Last run</p>
              <p className="text-xl font-bold text-foreground tabular-nums">
                {analytics.hasAnyRuns && analytics.lastRunGlobalScorePct != null
                  ? fmtPct(analytics.lastRunGlobalScorePct)
                  : "—"}
              </p>
            </div>
            <div className="border-border border-b p-4">
              <p className="text-sm text-muted-foreground">Avg</p>
              <p className="text-xl font-bold text-foreground tabular-nums">{fmtPct(analytics.avgScorePct)}</p>
            </div>
          </div>

          {analytics.showTrendUp ? (
            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-500">
              Trending up — your last 5 runs average higher than your all-time average.
            </p>
          ) : null}
          {analytics.showTrendDown ? (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-500">
              Trending down — your recent runs average below your all-time average.
            </p>
          ) : null}

          <div className="mt-auto flex flex-col pt-6">
            <Button asChild size="lg" className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/practice">Start Practice →</Link>
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">Just need the solver?</p>
            <Link
              href="/practice/solver"
              className="mt-1 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Open Sea Wolf Solver →
            </Link>
          </div>
        </div>

        <Card className="flex h-full min-h-0 flex-col gap-0 rounded-xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <div className="mb-6 flex items-start justify-between gap-3 border-b border-border pb-6">
            <CardTitle className="text-lg font-semibold">Your progress</CardTitle>
            <Link href="/dashboard/analytics" className="shrink-0 text-sm font-medium text-primary hover:underline">
              View full analytics →
            </Link>
          </div>
          <div className="grid flex-1 grid-cols-2">
            <div className="border-border border-b border-r p-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Runs recorded</p>
              <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{analytics.runsRecorded}</p>
            </div>
            <div className="border-border border-b p-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Best score</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 tabular-nums">{fmtPct(analytics.bestScorePct)}</p>
            </div>
            <div className="border-border border-r p-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Avg score</p>
              <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{fmtPct(analytics.avgScorePct)}</p>
            </div>
            <div className="p-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Last 5 avg</p>
              <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{fmtPct(analytics.last5AvgPct)}</p>
              {analytics.last5SampleSize > 0 && analytics.last5SampleSize < 5 ? (
                <p className="mt-2 text-xs text-muted-foreground">Based on {analytics.last5SampleSize} run(s)</p>
              ) : null}
            </div>
          </div>
        </Card>
      </div>

      {/* Row 3: Three cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Weakest phase */}
        <Card className="h-full min-h-[240px] gap-0 border-l-4 border-l-[#4ECDC4] py-0">
          <CardHeader className="flex flex-row items-center gap-2 border-b border-border px-6 py-6">
            <Target className="h-4 w-4 text-primary" aria-hidden />
            <CardTitle className="text-base font-semibold">Focus area</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 px-6 pb-6 pt-4">
            {analytics.weakestPhase ? (
              <>
                <p className="text-xl font-bold text-foreground">{analytics.weakestPhase.name}</p>
                <p className="text-sm font-medium text-amber-500">
                  Your avg: {analytics.weakestPhase.avgPct.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">{analytics.weakestPhase.tip}</p>
                <Link href="/practice" className="mt-auto pt-4 text-sm font-medium text-primary hover:underline">
                  Practice this phase →
                </Link>
              </>
            ) : analytics.hasAnyRuns ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Complete a full Sea Wolf simulation to see which phase needs the most work.
                </p>
                <Link href="/practice" className="mt-4 text-sm font-medium text-primary hover:underline">
                  Go to Sea Wolf →
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Play your first run to see your weakest phase.</p>
                <Link href="/practice" className="mt-4 text-sm font-medium text-primary hover:underline">
                  Start practicing →
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Next steps */}
        <Card className="h-full min-h-[240px] gap-0 py-0">
          <CardHeader className="flex flex-row items-center gap-2 border-b border-border px-6 py-6">
            <CheckSquare className="h-4 w-4 text-primary" aria-hidden />
            <CardTitle className="text-base font-semibold">Get started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6 pt-4">
            <ChecklistRow
              done={analytics.checklistFirstRunDone}
              label="Play your first full simulation"
              href="/practice"
            />
            <ChecklistRow
              done={analytics.checklistSolverUsed}
              label="Try the Sea Wolf Solver"
              href="/practice/solver"
            />
            <ChecklistRow
              done={analytics.checklistAnalyticsReviewed}
              label="Review your phase breakdown"
              href="/dashboard/analytics"
            />
            <ChecklistRow done={analytics.checklistGuideRead} label="Read the Sea Wolf guide" href="/resources" />
          </CardContent>
        </Card>

        {/* Resources */}
        <Card className="h-full min-h-[240px] gap-0 py-0">
          <CardHeader className="flex flex-row items-center gap-2 border-b border-border px-6 py-6">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden />
            <CardTitle className="text-base font-semibold">Resources</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border px-0 pb-0 pt-0">
            <ResourceRow icon={FileText} title="Sea Wolf Strategy Guide" subtitle="PDF · How to score in the top 10%" />
            <ResourceRow icon={BookOpen} title="How McKinsey Solve is scored" subtitle="Understanding the 5 conditions" />
            <ResourceRow icon={Play} title="Watch: Sea Wolf walkthrough" subtitle="Video guide · 8 minutes" />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function ChecklistRow({ done, label, href }: { done: boolean; label: string; href: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="mt-0.5 shrink-0" aria-hidden>
        {done ? (
          <span className="flex size-4 items-center justify-center rounded bg-teal-600 text-white dark:bg-teal-500">
            <Check className="size-3 stroke-[3]" aria-hidden />
          </span>
        ) : (
          <Square className="size-4 text-muted-foreground" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={href}
          className={cn(
            done
              ? "font-normal text-muted-foreground line-through"
              : "font-medium text-foreground hover:text-primary hover:underline",
          )}
        >
          {label}
        </Link>
      </div>
    </div>
  )
}

function ResourceRow({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
}) {
  return (
    <div className="flex cursor-default items-start gap-3 px-6 py-4 transition-colors hover:bg-muted/50">
      <Icon className="mt-0.5 size-5 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Badge variant="secondary" className="shrink-0 rounded-full border-0 bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
        Coming soon
      </Badge>
    </div>
  )
}
