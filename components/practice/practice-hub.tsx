import { GameCard } from "@/components/practice/game-card"

export function PracticeHub() {
  return (
    <main className="flex-1 bg-gray-50 p-8">
      <p className="text-xs tracking-widest text-gray-500 uppercase">PRACTICE HUB</p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900">Pick a game to practice.</h1>
      <p className="mt-3 max-w-2xl text-base text-gray-600">
        Practice with realistic simulators designed to match the McKinsey Solve
        assessment. Each game targets different skills.
      </p>

      <p className="mt-10 text-xs tracking-widest text-gray-500 uppercase">START A RUN</p>
      <h2 className="mt-2 text-2xl font-bold text-gray-900">Games &amp; Tools</h2>

      <div className="mt-4 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GameCard
          title="Sea Wolf"
          subtitle="30 MINUTES"
          description="Full 4-phase simulation across 3 sites. Mimicks the real McKinsey assessment."
          href="/practice/sea-wolf"
          cta="Practice"
          thumbnailSrc="/thumbnail-sea-wolf.png"
        />
        <GameCard
          title="Sea Wolf (Treatment Practice)"
          subtitle="10 MINUTES · STANDALONE"
          description="Drill Phase 4 (Treatment) in isolation. Choose your difficulty."
          href="/practice/sea-wolf-treatment"
          cta="Practice"
          thumbnailSrc="/thumbnail-treatment.png"
        />
        <GameCard
          title="Sea Wolf Solver"
          subtitle="TOOL"
          description="Manual-input solver for all 4 phases. Always get the perfect score."
          href="/practice/solver"
          cta="Open"
          thumbnailSrc="/thumbnail-solver.png"
        />
      </div>
    </main>
  )
}
