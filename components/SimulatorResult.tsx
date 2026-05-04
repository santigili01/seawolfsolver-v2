"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { Activity, Maximize2, Target, Trophy, XOctagon, Zap } from "lucide-react"

import type { GameResult, Pool, ScenarioRequirements, Microbe } from "@/app/simulator/types"
import { scoreCombo } from "@/lib/simulator-scoring"

type SimulatorResultProps = {
  result: GameResult
  scenarioRequirements: ScenarioRequirements
  pool: Pool
  onPlayAgain: () => void
}

function formatMmSs(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function scoreColorClass(score: number) {
  if (score >= 100) return "text-emerald-600"
  if (score >= 80) return "text-amber-600"
  return "text-red-600"
}

function microbeContribution(
  m: Microbe,
  req: ScenarioRequirements
): "positive" | "negative" | "neutral" {
  if (m.trait === req.undesired_trait) return "negative"
  if (m.trait === req.desired_trait) return "positive"
  return "neutral"
}

function sortedIdsKey(ids: string[]) {
  return [...ids].sort().join("\0")
}

export function SimulatorResult({
  result,
  scenarioRequirements,
  pool,
  onPlayAgain,
}: SimulatorResultProps) {
  const { means } = scoreCombo(result.selectedMicrobes, scenarioRequirements)
  const primaryOptimal = result.optimalCombos[0] ?? []
  const optimalScore = primaryOptimal.length === 3
    ? scoreCombo(primaryOptimal, scenarioRequirements).score
    : 0

  const playerKey = sortedIdsKey(result.selectedMicrobes.map((m) => m.id))
  const playerFoundOptimal = pool.best_combinations.some(
    (bc) => bc.length === 3 && sortedIdsKey(bc) === playerKey
  )

  const checklist: { label: string; pass: boolean; detail?: string }[] = [
    {
      label: "Mobility mean in range",
      pass: result.conditionResults[0],
      detail: `mean ${means.mobility.toFixed(2)} (need ${scenarioRequirements.attributes.Mobility.min}–${scenarioRequirements.attributes.Mobility.max})`,
    },
    {
      label: "Agility mean in range",
      pass: result.conditionResults[1],
      detail: `mean ${means.agility.toFixed(2)} (need ${scenarioRequirements.attributes.Agility.min}–${scenarioRequirements.attributes.Agility.max})`,
    },
    {
      label: "Size mean in range",
      pass: result.conditionResults[2],
      detail: `mean ${means.size.toFixed(2)} (need ${scenarioRequirements.attributes.Size.min}–${scenarioRequirements.attributes.Size.max})`,
    },
    {
      label: "Desired trait present",
      pass: result.conditionResults[3],
      detail: scenarioRequirements.desired_trait,
    },
    {
      label: "Undesired trait absent",
      pass: result.conditionResults[4],
      detail: scenarioRequirements.undesired_trait,
    },
  ]

  return (
    <div className="min-h-screen w-full bg-white text-gray-900">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Simulation Complete!
          </h1>
          <p className="mt-2 text-lg text-gray-600">Here&apos;s how you performed</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-500">Your Score</p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${scoreColorClass(result.playerScore)}`}>
              {result.playerScore}/100
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-500">Max Possible Score</p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${scoreColorClass(result.maxScore)}`}>
              {result.maxScore}/100
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-500">Time Spent</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-gray-800">
              {formatMmSs(result.timeSpent)}
            </p>
          </div>
        </div>

        <p className="mb-8 text-center text-base text-gray-600">
          You scored {result.playerScore}/100 on {result.scenarioName}. The optimal score was {result.maxScore}/100.
          {playerFoundOptimal ? " You found the optimal combination! 🎉" : ""}
        </p>

        <div className="mb-12 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="inline-flex h-11 items-center justify-center rounded-md bg-gray-900 px-8 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Play Again
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-md border border-gray-300 bg-white px-8 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
          >
            Quit
          </Link>
        </div>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Site information</h2>
          <p className="text-gray-600 mb-4">
            <span className="font-medium text-gray-800">{result.scenarioName}</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <InfoCard
              icon={<Activity className="h-5 w-5" />}
              label="Mobility range"
              value={`${scenarioRequirements.attributes.Mobility.min}–${scenarioRequirements.attributes.Mobility.max}`}
            />
            <InfoCard
              icon={<Zap className="h-5 w-5" />}
              label="Agility range"
              value={`${scenarioRequirements.attributes.Agility.min}–${scenarioRequirements.attributes.Agility.max}`}
            />
            <InfoCard
              icon={<Maximize2 className="h-5 w-5" />}
              label="Size range"
              value={`${scenarioRequirements.attributes.Size.min}–${scenarioRequirements.attributes.Size.max}`}
            />
            <InfoCard
              icon={<Target className="h-5 w-5" />}
              label="Desired trait"
              value={scenarioRequirements.desired_trait}
            />
            <InfoCard
              icon={<XOctagon className="h-5 w-5" />}
              label="Undesired trait"
              value={scenarioRequirements.undesired_trait}
            />
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your selection</h2>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            {result.selectedMicrobes.map((m) => {
              const c = microbeContribution(m, scenarioRequirements)
              const tone =
                c === "positive"
                  ? "border-emerald-200 bg-emerald-50/60"
                  : c === "negative"
                    ? "border-red-200 bg-red-50/60"
                    : "border-gray-200 bg-gray-50/80"
              const label =
                c === "positive"
                  ? "Positive (desired trait)"
                  : c === "negative"
                    ? "Negative (undesired trait)"
                    : "Neutral"
              return (
                <div
                  key={m.id}
                  className={`rounded-xl border p-4 shadow-sm ${tone}`}
                >
                  <p className="font-semibold text-gray-900">{m.name}</p>
                  <p className="mt-2 text-sm text-gray-600 tabular-nums">
                    Mobility {m.Mobility} · Agility {m.Agility} · Size {m.Size}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">Trait: {m.trait}</p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                    {label}
                  </p>
                </div>
              )
            })}
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mb-3">Condition checklist</h3>
          <ul className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            {checklist.map((row) => (
              <li key={row.label} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                <span className="text-lg" aria-hidden>
                  {row.pass ? "✅" : "❌"}
                </span>
                <span className="font-medium text-gray-900">{row.label}</span>
                {row.detail ? (
                  <span className="text-sm text-gray-600 sm:ml-auto">{row.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Optimal combination
          </h2>

          {playerFoundOptimal ? (
            <p className="text-lg text-emerald-700 font-medium mb-4">
              🎉 You found the optimal combination!
            </p>
          ) : (
            <p className="text-gray-700 mb-4">The optimal combination was:</p>
          )}

          {result.optimalCombos.map((combo, idx) => (
            <div key={idx} className="mb-6 last:mb-0">
              {result.optimalCombos.length > 1 ? (
                <p className="text-sm text-gray-500 mb-2">Option {idx + 1}</p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-3">
                {combo.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                  >
                    <p className="font-medium text-gray-900">{m.name}</p>
                    <p className="mt-1 text-xs text-gray-600 tabular-nums">
                      M {m.Mobility} · A {m.Agility} · S {m.Size}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">{m.trait}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="mt-4 text-sm text-gray-700">
            <span className="font-medium">Optimal combo score:</span>{" "}
            <span className="tabular-nums">{optimalScore}/100</span>
          </p>
        </section>

        {result.maxScore < 100 ? (
          <p className="text-center text-xs text-gray-500 max-w-2xl mx-auto">
            Note: perfect scores (100) are not always achievable. The max possible score shown reflects
            the best achievable result for this pool.
          </p>
        ) : null}
      </div>
    </div>
  )
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 text-teal-600">{icon}</div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900 leading-snug">{value}</p>
    </div>
  )
}
