import { BarChart3, Target, Trophy } from "lucide-react"
import { GameCard } from "@/components/practice/game-card"
import { StatCard } from "@/components/practice/stat-card"

export function PracticeHub() {
  return (
    <main className="flex-1 bg-gray-50 p-8">
      <p className="text-xs tracking-widest text-gray-500 uppercase">PRACTICE HUB</p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900">Pick a game to practice.</h1>
      <p className="mt-3 max-w-2xl text-base text-gray-600">
        Practice with realistic simulators designed to match the McKinsey Solve
        assessment. Each game targets different skills.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<BarChart3 className="h-5 w-5 text-amber-700" />}
          label="Total Runs"
          value="0"
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-amber-700" />}
          label="Sea Wolf Best"
          value="—"
        />
        <StatCard
          icon={<Trophy className="h-5 w-5 text-amber-700" />}
          label="Solver Sessions"
          value="0"
        />
      </div>

      <p className="mt-10 text-xs tracking-widest text-gray-500 uppercase">START A RUN</p>
      <h2 className="mt-2 text-2xl font-bold text-gray-900">Games &amp; Tools</h2>

      <div className="mt-4 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GameCard
          badge={{ label: "Available", tone: "green" }}
          title="Sea Wolf"
          subtitle="30 MINUTES"
          description="Full 4-phase simulation across 3 sites. Tests pattern recognition and decision-making under time pressure."
          href="/practice/sea-wolf"
          cta="Play"
        />
        <GameCard
          badge={{ label: "Phase 4", tone: "blue" }}
          title="Treatment Practice"
          subtitle="STANDALONE · PHASE 4"
          description="Drill the treatment selection phase in isolation. Choose your difficulty and find the optimal microbe combination."
          href="/practice/sea-wolf-treatment"
          cta="Practice"
        />
        <GameCard
          badge={{ label: "Tool", tone: "gray" }}
          title="Sea Wolf Solver"
          subtitle="TOOL"
          description="Manual-input solver for all 4 phases. Use it alongside the real assessment."
          href="/practice/solver"
          cta="Open"
        />
      </div>
    </main>
  )
}
