"use client"

import Link from "next/link"
import { ChevronDown, LogOut, Settings } from "lucide-react"
import { combinations3, computeSiteAverage, type GameScore, type Phase4MicrobeInput, type Phase4Score, type SelectionItem as GSelectionItem, type SiteScore } from "@/lib/game-scoring"
import { ATTR_NAMES, GRID_SLOTS, type Microbe, type ProspectRoundJson, type RevealedCharacteristic, type ScenarioRequirements } from "@/lib/game-types"
import {
  MicrobeAttributeRow,
  MicrobeSvgFor,
  SlotAttributeRow,
  Tooltip,
  TraitBadgeChip,
  attributeKeyIcon,
  attributeRowIcon,
  traitIcon,
} from "@/lib/game-visuals"
import {
  categorizeMicrobeForResults,
  formatMmSs,
  getInviableAttributes,
  traitColor,
  traitChipBg,
} from "@/lib/game-helpers"

export function phase2ChoiceLabel(choice: "site1" | "site2" | "return", siteNum: number) {
  if (choice === "site1") return `Site ${siteNum}`
  if (choice === "site2") return `Site ${siteNum + 1}`
  return "Return"
}

export function phase3RoundFeedback(
  rr: import("@/lib/game-scoring").RoundResult,
  chooseSet: ProspectRoundJson | null | undefined,
  req: ScenarioRequirements,
): string {
  if (!chooseSet) {
    if (rr.playerPickClassification === "optimal") return "Optimal pick — strongest candidate this round."
    if (rr.playerPickClassification === "negative") return "Negative pick — this microbe reduces your pool's ceiling."
    return "Neutral pick."
  }

  const playerCand = chooseSet.candidates.find((c) => c.microbe.id === rr.playerPickId)
  const optimalCand = chooseSet.candidates.find((c) => c.classification === "optimal")
  const attrs = ["Mobility", "Agility", "Size"] as const

  function whyNegative(m: Microbe): string {
    if (m.trait === req.undesired_trait) return `has the undesired trait (${m.trait})`
    const inviable = attrs.filter((a) => {
      const val = m[a]
      const minSum = val + 1 + 1
      const maxSum = val + 10 + 10
      return maxSum < req.attributes[a].min * 3 || minSum > req.attributes[a].max * 3
    })
    if (inviable.length > 0) return `is inviable on ${inviable.join(", ")}`
    return "does not contribute to a valid combination"
  }

  function attrsInRange(m: Microbe): string[] {
    return attrs.filter((a) => m[a] >= req.attributes[a].min && m[a] <= req.attributes[a].max)
  }

  if (rr.playerPickClassification === "optimal") {
    return `Optimal pick — ${playerCand?.microbe.name ?? "your pick"} was the best candidate (${playerCand?.conditions_satisfied ?? "?"} conditions satisfied).`
  }

  if (rr.playerPickClassification === "negative" && optimalCand) {
    const why = playerCand ? whyNegative(playerCand.microbe) : "it is a negative candidate"
    return `Bad pick — ${playerCand?.microbe.name ?? "your pick"} ${why}. ${optimalCand.microbe.name} was optimal (${optimalCand.conditions_satisfied} conditions satisfied), and missing it hurts your pool's achievable max score.`
  }

  if (rr.playerPickClassification === "negative" && !optimalCand) {
    const why = playerCand ? whyNegative(playerCand.microbe) : "it is a negative candidate"
    return `Bad pick — ${playerCand?.microbe.name ?? "your pick"} ${why}. No optimal was available; any neutral would have been better.`
  }

  if (rr.optimalId && optimalCand && playerCand) {
    const playerIn = attrsInRange(playerCand.microbe)
    const optimalIn = attrsInRange(optimalCand.microbe)
    const desiredNote = optimalCand.microbe.trait === req.desired_trait ? ` and has the desired trait (${req.desired_trait})` : ""
    return `Missed optimal — ${optimalCand.microbe.name} covers ${optimalIn.length}/3 attribute ranges${desiredNote}. Your pick (${playerCand.microbe.name}) covers ${playerIn.length}/3, which hurts your pool's achievable max score.`
  }

  const bestNeutral = chooseSet.candidates
    .filter((c) => c.classification === "neutral" && c.neutral_score !== null)
    .sort((a, b) => (b.neutral_score ?? 0) - (a.neutral_score ?? 0))[0]

  if (bestNeutral && playerCand && bestNeutral.microbe.id !== playerCand.microbe.id) {
    const bestIn = attrsInRange(bestNeutral.microbe)
    const playerIn = attrsInRange(playerCand.microbe)
    const desiredNote = bestNeutral.microbe.trait === req.desired_trait ? ` with the desired trait (${req.desired_trait})` : ""
    return `Weaker neutral — ${bestNeutral.microbe.name} covers ${bestIn.length}/3 attribute ranges${desiredNote}. You picked ${playerCand.microbe.name} (${playerIn.length}/3 in range).`
  }

  return "Good pick — best available option this round."
}

export function gameResultsScoreDisplayColorClass(score: number) {
  if (score >= 80) return "text-emerald-600"
  if (score >= 60) return "text-amber-600"
  return "text-red-600"
}

export function gameResultsOptimalScoreLineClass(score: number) {
  if (score >= 80) return "text-emerald-600 font-semibold"
  if (score >= 60) return "text-amber-600 font-semibold"
  return "text-red-600 font-semibold"
}

export function gameResultsScoreChipClass(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-800"
  if (score >= 60) return "bg-amber-100 text-amber-800"
  return "bg-red-100 text-red-800"
}

export function gameResultsBreakdownBorderClass(player: number, max: number) {
  if (player === max) return "border-l-emerald-500"
  if (player >= 60) return "border-l-amber-400"
  return "border-l-red-500"
}

export function microbeResultKey(m: Phase4MicrobeInput & { id?: string }) {
  if (m.id) return `id:${m.id}`
  return `v:${m.Mobility}-${m.Agility}-${m.Size}-${m.trait}`
}

export function buildGamePhase4Checklist(p4: Phase4Score, scenario: ScenarioRequirements) {
  const trio = p4.selectedMicrobes as Microbe[]
  const n = Math.max(1, trio.length)
  const means = {
    mobility: trio.reduce((s, m) => s + m.Mobility, 0) / n,
    agility: trio.reduce((s, m) => s + m.Agility, 0) / n,
    size: trio.reduce((s, m) => s + m.Size, 0) / n,
  }
  const req = scenario
  const cr = p4.conditionResults
  return [
    {
      label: "Mobility mean in range",
      pass: cr.mobilityInRange,
      detail: `Required: ${req.attributes.Mobility.min}–${req.attributes.Mobility.max} · Actual: ${means.mobility.toFixed(2)}`,
    },
    {
      label: "Agility mean in range",
      pass: cr.agilityInRange,
      detail: `Required: ${req.attributes.Agility.min}–${req.attributes.Agility.max} · Actual: ${means.agility.toFixed(2)}`,
    },
    {
      label: "Size mean in range",
      pass: cr.sizeInRange,
      detail: `Required: ${req.attributes.Size.min}–${req.attributes.Size.max} · Actual: ${means.size.toFixed(2)}`,
    },
    { label: `${req.desired_trait} present`, pass: cr.desiredTraitPresent },
    { label: `${req.undesired_trait} avoided`, pass: cr.undesiredTraitAbsent },
  ] as const
}

export function GameResultsFull({
  gameScore,
  totalSeconds,
  siteDetail,
}: {
  gameScore: import("@/lib/game-scoring").GameScore
  totalSeconds: number
  siteDetail: {
    site: SiteScore
    phase1Picks?: GSelectionItem[]
    scenarios: ScenarioRequirements
    treatmentPool: Microbe[]
    catPoolMicrobes: Microbe[]
    prospectChooseSets: ProspectRoundJson[]
    revealedChar: RevealedCharacteristic | null
  }[]
}) {
  const accentHeading =
    "border-l-4 border-[#4ECDC4] pl-3 text-lg font-bold text-[#1a202c]"
  const sectionCard = "rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm"
  const statCard =
    "rounded-xl border border-[#e2e8f0] border-l-4 border-l-[#4ECDC4] bg-white p-5 text-center shadow-sm"
  const phaseCard = "rounded-xl border border-gray-200 bg-white/95 p-6 shadow-sm"

  const passFailIcon = (pass: boolean) =>
    pass ? (
      <svg className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <circle cx="8" cy="8" r="8" className="text-emerald-100" fill="currentColor" opacity="0.25" />
        <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    ) : (
      <svg className="h-4 w-4 shrink-0 text-red-600" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.12" />
        <path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    )

  return (
    <div className="min-h-screen w-full bg-[#f8fffe] text-gray-900">
      <header className="fixed top-0 right-0 left-0 z-40 flex h-14 shrink-0 items-center justify-between bg-[rgba(20,30,50,0.9)] px-6">
        <h1 className="min-w-0 shrink truncate pr-4 text-lg font-bold text-white sm:text-xl">Simulation Complete!</h1>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => typeof window !== "undefined" && window.location.reload()}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#4ECDC4] px-5 text-sm font-semibold text-[#1a202c] transition-opacity hover:opacity-90"
          >
            Play Again
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-lg border-2 border-white bg-transparent px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Quit
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-[calc(3.5rem+1rem)] sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className={statCard}>
            <p className="text-sm font-medium text-gray-500">Overall Score</p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${gameResultsScoreDisplayColorClass(gameScore.globalAverage)}`}>
              {Math.round(gameScore.globalAverage)}%
            </p>
          </div>
          <div className={statCard}>
            <p className="text-sm font-medium text-gray-500">Total Time</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-gray-800">{formatMmSs(totalSeconds)}</p>
          </div>
          <div className={statCard}>
            <p className="text-sm font-medium text-gray-500">Phase Averages</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${gameResultsScoreChipClass(gameScore.perPhaseAverages.phase1)}`}>P1: {Math.round(gameScore.perPhaseAverages.phase1)}%</span>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${gameResultsScoreChipClass(gameScore.perPhaseAverages.phase2)}`}>P2: {Math.round(gameScore.perPhaseAverages.phase2)}%</span>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${gameResultsScoreChipClass(gameScore.perPhaseAverages.phase0)}`}>P0: {Math.round(gameScore.perPhaseAverages.phase0)}%</span>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${gameResultsScoreChipClass(gameScore.perPhaseAverages.phase3)}`}>P3: {Math.round(gameScore.perPhaseAverages.phase3)}%</span>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${gameResultsScoreChipClass(gameScore.perPhaseAverages.phase4)}`}>P4: {Math.round(gameScore.perPhaseAverages.phase4)}%</span>
            </div>
          </div>
        </div>

        <div className="mb-8 space-y-2">
          {siteDetail.map((entry, i) => {
            const s = entry.site
            return (
              <div
                key={`breakdown-${s.siteNumber}-${i}`}
                className={`rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm border-l-4 ${gameResultsBreakdownBorderClass(s.siteAverage, 100)}`}
              >
                <div className="grid items-center gap-2" style={{ gridTemplateColumns: "1fr auto auto" }}>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900">Site {i + 1}</div>
                    <div className="text-sm text-gray-500">{s.scenarioName}</div>
                  </div>
                  <span className="text-sm tabular-nums text-gray-400">{formatMmSs(s.timeSpent)}</span>
                  <span className={`text-sm font-semibold tabular-nums ${gameResultsScoreDisplayColorClass(s.siteAverage)}`}>
                    {Math.round(s.siteAverage)}%
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${gameResultsScoreChipClass(s.phase1.percentage)}`}>P1: {Math.round(s.phase1.percentage)}%</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${gameResultsScoreChipClass(s.phase2.percentage)}`}>P2: {Math.round(s.phase2.percentage)}%</span>
                  {s.phase0 ? (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${gameResultsScoreChipClass(s.phase0.percentage)}`}>P0: {Math.round(s.phase0.percentage)}%</span>
                  ) : null}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${gameResultsScoreChipClass(s.phase3.percentage)}`}>P3: {Math.round(s.phase3.percentage)}%</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${gameResultsScoreChipClass(s.phase4.percentage)}`}>P4: {Math.round(s.phase4.percentage)}%</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="space-y-4">
          {siteDetail.map((entry, siteIdx) => {
            const s = entry.site
            const isLastSite = siteIdx === siteDetail.length - 1 || s.siteNumber === 3
            const req = entry.scenarios
            const pool = entry.treatmentPool.length ? entry.treatmentPool : (s.phase4.selectedMicrobes as Microbe[])
            const checklistRows = buildGamePhase4Checklist(s.phase4, req)
            const optimalMemberKeys = new Set(s.phase4.optimalCombination.map((m) => microbeResultKey(m as Microbe)))
            const selectedKeys = new Set(s.phase4.selectedMicrobes.map((m) => microbeResultKey(m as Microbe)))
            const playerKeysSorted = [...s.phase4.selectedMicrobes].map((m) => microbeResultKey(m as Microbe)).sort().join("\0")
            const optimalKeysSorted = [...s.phase4.optimalCombination].map((m) => microbeResultKey(m as Microbe)).sort().join("\0")
            const playerFoundOptimal =
              playerKeysSorted === optimalKeysSorted && playerKeysSorted.length > 0 && s.phase4.selectedMicrobes.length === 3
            const initialProspectPool = pool.slice(0, 6)
            const phase1TraitPick = entry.phase1Picks?.find((p) => p.type === "trait") ?? null
            const phase1AttributePick = entry.phase1Picks?.find((p) => p.type === "attribute") ?? null
            const badgeBase =
              "absolute top-[-12px] z-10 whitespace-nowrap rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow"

            const resolveName = (id: string) =>
              entry.catPoolMicrobes.find((x) => x.id === id)?.name ?? pool.find((m) => m.id === id)?.name ?? id

            const phase0ClassificationBadge = (c: string) => {
              if (c === "good") return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
              if (c === "bad") return "bg-red-100 text-red-800 ring-1 ring-red-200"
              return "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
            }

            return (
              <details
                key={`site-detail-game-${s.siteNumber}-${siteIdx}`}
                open={siteIdx === 0}
                className="group rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm open:pb-6 open:[&>summary>svg]:rotate-180"
              >
                <summary className="flex cursor-pointer list-none select-none items-center justify-between text-xl font-bold text-[#1a202c] transition-colors hover:text-[#4ECDC4] [&::-webkit-details-marker]:hidden">
                  <span>Site {siteIdx + 1}</span>
                  <ChevronDown className="h-6 w-6 shrink-0 text-gray-600 transition-transform group-open:rotate-180" />
                </summary>

                <div className="mt-6 space-y-6">
                  {/* Phase 0 */}
                  {siteIdx > 0 && s.phase0 ? (
                    <section className={phaseCard}>
                      <div className="mb-4 inline-flex rounded-full bg-[#eefcfb] px-3 py-1 text-sm font-semibold text-[#0f766e] ring-1 ring-[#cceeea]">
                        Phase 0 · Review · {s.phase0.raw}/{s.phase0.n} (<span className={gameResultsScoreDisplayColorClass(s.phase0.percentage)}>{Math.round(s.phase0.percentage)}%</span>)
                      </div>
                      <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                        <div className="mb-1 font-semibold text-gray-800">Site {siteIdx + 1} info</div>
                        <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap text-gray-700">
                          <span className="font-medium text-gray-800">{req.name}</span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-flex">{attributeRowIcon("Mobility")}</span>
                            <span>Mobility: {req.attributes.Mobility.min}–{req.attributes.Mobility.max}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-flex">{attributeRowIcon("Agility")}</span>
                            <span>Agility: {req.attributes.Agility.min}–{req.attributes.Agility.max}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-flex">{attributeRowIcon("Size")}</span>
                            <span>Size: {req.attributes.Size.min}–{req.attributes.Size.max}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span>Desired:</span>
                            <span
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                              style={{ backgroundColor: traitChipBg(req.desired_trait), color: traitColor(req.desired_trait) }}
                            >
                              {traitIcon(req.desired_trait, "h-3.5 w-3.5")}
                            </span>
                            <span>{req.desired_trait}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span>Undesired:</span>
                            <span
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                              style={{ backgroundColor: traitChipBg(req.undesired_trait), color: traitColor(req.undesired_trait) }}
                            >
                              {traitIcon(req.undesired_trait, "h-3.5 w-3.5")}
                            </span>
                            <span>{req.undesired_trait}</span>
                          </span>
                        </div>
                      </div>
                      <ul className="space-y-2">
                        {s.phase0.decisions.map((d) => {
                          const p0m = pool.find((x) => x.id === d.microbeId) ?? null
                          return (
                            <li
                              key={d.microbeId}
                              className={`rounded-lg border p-3 text-sm shadow-sm ${d.correct ? "border-gray-200 bg-white" : "border-red-300 bg-red-50"}`}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-gray-900">{d.microbeName}</span>
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${phase0ClassificationBadge(d.classification)}`}>
                                  {d.classification}
                                </span>
                                <span className="text-gray-600">
                                  Your choice: <span className="font-medium">{d.playerChoice}</span>
                                </span>
                                <span className={`font-semibold ${d.correct ? "text-emerald-600" : "text-red-600"}`}>
                                  {d.correct ? "Correct" : "Incorrect"}
                                </span>
                              </div>
                              {p0m ? (
                                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-600">
                                  <span className="inline-flex">{attributeKeyIcon("Mobility")}</span>
                                  <span>{p0m.Mobility}</span>
                                  <span className="inline-flex">{attributeKeyIcon("Agility")}</span>
                                  <span>{p0m.Agility}</span>
                                  <span className="inline-flex">{attributeKeyIcon("Size")}</span>
                                  <span>{p0m.Size}</span>
                                  <TraitBadgeChip trait={p0m.trait} />
                                </div>
                              ) : null}
                              <p className="mt-1 text-xs text-gray-600">{d.reason}</p>
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  ) : null}

                  {/* Phase 1 */}
                  <section className={phaseCard}>
                    <div className="mb-4 inline-flex rounded-full bg-[#eefcfb] px-3 py-1 text-sm font-semibold text-[#0f766e] ring-1 ring-[#cceeea]">
                      Phase 1 · Profile · {s.phase1.raw}/2 (<span className={gameResultsScoreDisplayColorClass(s.phase1.percentage)}>{Math.round(s.phase1.percentage)}%</span>)
                    </div>
                    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                      <div className="mb-1 font-semibold text-gray-800">Site {siteIdx + 1} info</div>
                      <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap text-gray-700">
                        <span className="font-medium text-gray-800">{req.name}</span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-flex">{attributeRowIcon("Mobility")}</span>
                          <span>Mobility: {req.attributes.Mobility.min}–{req.attributes.Mobility.max}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-flex">{attributeRowIcon("Agility")}</span>
                          <span>Agility: {req.attributes.Agility.min}–{req.attributes.Agility.max}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-flex">{attributeRowIcon("Size")}</span>
                          <span>Size: {req.attributes.Size.min}–{req.attributes.Size.max}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span>Desired:</span>
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                            style={{ backgroundColor: traitChipBg(req.desired_trait), color: traitColor(req.desired_trait) }}
                          >
                            {traitIcon(req.desired_trait, "h-3.5 w-3.5")}
                          </span>
                          <span>{req.desired_trait}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span>Undesired:</span>
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                            style={{ backgroundColor: traitChipBg(req.undesired_trait), color: traitColor(req.undesired_trait) }}
                          >
                            {traitIcon(req.undesired_trait, "h-3.5 w-3.5")}
                          </span>
                          <span>{req.undesired_trait}</span>
                        </span>
                      </div>
                    </div>
                    <div className="mb-4 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                      <div className="font-semibold text-gray-900">Your picks</div>
                      <div className="mt-1 flex flex-wrap items-center gap-4">
                        <span className="flex items-center gap-1.5">
                          <span>Trait:</span>
                          {phase1TraitPick ? (
                            <>
                              <span
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                                style={{ backgroundColor: traitChipBg(phase1TraitPick.name), color: traitColor(phase1TraitPick.name) }}
                              >
                                {traitIcon(phase1TraitPick.name, "h-3.5 w-3.5")}
                              </span>
                              <span className="font-medium">{phase1TraitPick.name}</span>
                            </>
                          ) : (
                            <span className="text-gray-500">No trait selected</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span>Attribute:</span>
                          {phase1AttributePick ? (
                            <>
                              <span className="inline-flex">{attributeRowIcon(phase1AttributePick.name as (typeof ATTR_NAMES)[number])}</span>
                              <span className="font-medium">
                                {phase1AttributePick.name}
                                {typeof phase1AttributePick.selectedMin === "number" && typeof phase1AttributePick.selectedMax === "number"
                                  ? ` ${phase1AttributePick.selectedMin}–${phase1AttributePick.selectedMax}`
                                  : ""}
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-500">No attribute selected</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <p className="mb-4 text-sm leading-relaxed text-gray-600">
                      In Phase 1 you earn 1 point for selecting the site's desired trait, and 1 point for selecting the most strategically
                      important attribute — the one whose range is furthest from the middle of the 1–10 scale (e.g. 1–3 or 8–10 are more
                      extreme than 4–6). You also need to position the slider at the correct range. The optimal strategy is always: desired
                      trait + most extreme attribute.
                    </p>
                    <div className="flex flex-col gap-3">
                      <div
                        className={`flex gap-3 rounded-lg border px-3 py-2 ${s.phase1.traitCorrect ? "border-gray-200 bg-white" : "border-red-200 bg-red-50/40"}`}
                      >
                        {passFailIcon(s.phase1.traitCorrect)}
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-semibold uppercase tracking-wide ${s.phase1.traitCorrect ? "text-emerald-600" : "text-red-600"}`}>
                            Trait
                          </div>
                          <p className="text-sm text-gray-700">{s.phase1.explanation.trait}</p>
                        </div>
                      </div>
                      <div
                        className={`flex gap-3 rounded-lg border px-3 py-2 ${s.phase1.attributeCorrect ? "border-gray-200 bg-white" : "border-red-200 bg-red-50/40"}`}
                      >
                        {passFailIcon(s.phase1.attributeCorrect)}
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-xs font-semibold uppercase tracking-wide ${s.phase1.attributeCorrect ? "text-emerald-600" : "text-red-600"}`}
                          >
                            Attribute
                          </div>
                          <p className="text-sm text-gray-700">{s.phase1.explanation.attribute}</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Phase 2 */}
                  <section className={phaseCard}>
                    <div className="mb-4 inline-flex rounded-full bg-[#eefcfb] px-3 py-1 text-sm font-semibold text-[#0f766e] ring-1 ring-[#cceeea]">
                      Phase 2 · Categorization · {s.phase2.raw}/10 (<span className={gameResultsScoreDisplayColorClass(s.phase2.percentage)}>{Math.round(s.phase2.percentage)}%</span>)
                    </div>
                    <div className={`mb-4 grid gap-2 ${siteIdx < 2 ? "md:grid-cols-[1.6fr_1fr]" : "md:grid-cols-1"}`}>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                        <div className="mb-1 font-semibold text-gray-800">Site {siteIdx + 1} info</div>
                        <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap text-gray-700">
                          <span className="font-medium text-gray-800">{req.name}</span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-flex">{attributeRowIcon("Mobility")}</span>
                            <span>Mobility: {req.attributes.Mobility.min}–{req.attributes.Mobility.max}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-flex">{attributeRowIcon("Agility")}</span>
                            <span>Agility: {req.attributes.Agility.min}–{req.attributes.Agility.max}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-flex">{attributeRowIcon("Size")}</span>
                            <span>Size: {req.attributes.Size.min}–{req.attributes.Size.max}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span>Desired:</span>
                            <span
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                              style={{ backgroundColor: traitChipBg(req.desired_trait), color: traitColor(req.desired_trait) }}
                            >
                              {traitIcon(req.desired_trait, "h-3.5 w-3.5")}
                            </span>
                            <span>{req.desired_trait}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span>Undesired:</span>
                            <span
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                              style={{ backgroundColor: traitChipBg(req.undesired_trait), color: traitColor(req.undesired_trait) }}
                            >
                              {traitIcon(req.undesired_trait, "h-3.5 w-3.5")}
                            </span>
                            <span>{req.undesired_trait}</span>
                          </span>
                        </div>
                      </div>
                      {siteIdx < 2 ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs">
                          <div className="font-semibold text-amber-800">Site {siteIdx + 2} insight</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-amber-900">
                            {entry.revealedChar ? (
                              entry.revealedChar.type === "trait" ? (
                                <>
                                  <span>Desired:</span>
                                  <span
                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                                    style={{
                                      backgroundColor: traitChipBg(String(entry.revealedChar.value)),
                                      color: traitColor(String(entry.revealedChar.value)),
                                    }}
                                  >
                                    {traitIcon(String(entry.revealedChar.value), "h-3.5 w-3.5")}
                                  </span>
                                  <span>{String(entry.revealedChar.value)}</span>
                                </>
                              ) : (
                                <>
                                  <span className="inline-flex">{attributeRowIcon(entry.revealedChar.name as (typeof ATTR_NAMES)[number])}</span>
                                  <span>
                                    {entry.revealedChar.name}: {(entry.revealedChar.value as { min: number; max: number }).min}–
                                    {(entry.revealedChar.value as { min: number; max: number }).max}
                                  </span>
                                </>
                              )
                            ) : (
                              <span>No additional insight shown for this site.</span>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
                      {s.phase2.decisions.map((d) => {
                        const effectiveChoice = (c: "site1" | "site2" | "return") =>
                          isLastSite && c === "site2" ? "return" : c
                        const wrong = d.playerChoice !== d.correctChoice
                        const ex = s.phase2.explanation.incorrect.find((i) => i.id === d.microbeId)
                        const pm = entry.catPoolMicrobes.find((x) => x.id === d.microbeId) ?? pool.find((x) => x.id === d.microbeId) ?? null
                        const rewrittenReason = ex?.reason ?? null
                        return (
                          <div
                            key={d.microbeId}
                            className={`rounded-lg border p-2 text-[11px] shadow-sm ${wrong ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}
                          >
                            <div className="font-semibold leading-tight text-gray-900 line-clamp-2">{pm?.name ?? resolveName(d.microbeId)}</div>
                            {pm ? (
                              <div className="mt-1 space-y-0.5 text-[10px] text-gray-700">
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex">{attributeKeyIcon("Mobility")}</span>
                                  <span>{pm.Mobility}</span>
                                  <span className="inline-flex">{attributeKeyIcon("Agility")}</span>
                                  <span>{pm.Agility}</span>
                                  <span className="inline-flex">{attributeKeyIcon("Size")}</span>
                                  <span>{pm.Size}</span>
                                  <TraitBadgeChip trait={pm.trait} />
                                </div>
                              </div>
                            ) : null}
                            <div className="mt-1 text-gray-600">
                              You: <span className="font-medium">{phase2ChoiceLabel(effectiveChoice(d.playerChoice), siteIdx + 1)}</span>
                            </div>
                            <div className="text-gray-600">
                              Correct: <span className="font-medium">{phase2ChoiceLabel(effectiveChoice(d.correctChoice), siteIdx + 1)}</span>
                            </div>
                            {wrong && rewrittenReason ? (
                              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-red-600">
                                {rewrittenReason
                                  .split(/\.\s+/)
                                  .map((line) => line.trim())
                                  .filter(Boolean)
                                  .map((line, idx) => (
                                    <li key={`${d.microbeId}-reason-${idx}`}>
                                      {line.endsWith(".") ? line : `${line}.`}
                                    </li>
                                  ))}
                              </ul>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </section>

                  {/* Phase 3 */}
                  <section className={phaseCard}>
                    <div className="mb-4 inline-flex rounded-full bg-[#eefcfb] px-3 py-1 text-sm font-semibold text-[#0f766e] ring-1 ring-[#cceeea]">
                      Phase 3 · Prospect Pool · <span className={gameResultsScoreDisplayColorClass(s.phase3.percentage)}>{Math.round(s.phase3.percentage)}%</span>
                    </div>
                    <p className="mb-4 text-sm text-gray-600">
                      Phase 3 scores how well you built your prospect pool. Each round you lose points for picking a worse option when a
                      better one was available: −2 for picking neutral over optimal, −3 for picking negative. Without an optimal pick, −1 for
                      a worse neutral, −2 for negative. A further penalty applies if your pool can't reach the original maximum treatment
                      score.
                    </p>
                    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Initial Prospect Pool (6 Microbes)</p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {initialProspectPool.map((m) => (
                          <div key={`p3-initial-${m.id}`} className="rounded-md border border-gray-200 bg-gray-50 p-2">
                            <p className="line-clamp-1 text-xs font-bold text-gray-900">{m.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
                              <span className="inline-flex items-center gap-1">
                                <span className="inline-flex">{attributeKeyIcon("Mobility")}</span>
                                <span>Mobility: {m.Mobility}</span>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="inline-flex">{attributeKeyIcon("Agility")}</span>
                                <span>Agility: {m.Agility}</span>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="inline-flex">{attributeKeyIcon("Size")}</span>
                                <span>Size: {m.Size}</span>
                              </span>
                              <TraitBadgeChip trait={m.trait} chipClassName="h-5 w-5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mb-4 rounded-lg border border-[#cceeea] bg-[#f8fffe] p-3 shadow-sm">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#0f766e]">Site info</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#cceeea] bg-white px-2.5 py-1 text-xs font-medium text-[#1a202c]">
                          {attributeKeyIcon("Mobility")} Mobility {req.attributes.Mobility.min}-{req.attributes.Mobility.max}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#cceeea] bg-white px-2.5 py-1 text-xs font-medium text-[#1a202c]">
                          {attributeKeyIcon("Agility")} Agility {req.attributes.Agility.min}-{req.attributes.Agility.max}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#cceeea] bg-white px-2.5 py-1 text-xs font-medium text-[#1a202c]">
                          {attributeKeyIcon("Size")} Size {req.attributes.Size.min}-{req.attributes.Size.max}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                          {traitIcon(req.desired_trait, "h-3.5 w-3.5 shrink-0")} Desired: {req.desired_trait}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800">
                          {traitIcon(req.undesired_trait, "h-3.5 w-3.5 shrink-0")} Undesired: {req.undesired_trait}
                        </span>
                      </div>
                    </div>
                    <div className="mb-4 grid gap-3 sm:grid-cols-2">
                      {s.phase3.roundResults.map((rr, rrIdx) => {
                        const chooseSet = entry.prospectChooseSets[rrIdx]
                        const bestNeutral = chooseSet
                          ? chooseSet.candidates
                              .filter((c) => c.classification === "neutral" && c.neutral_score !== null)
                              .sort((a, b) => (b.neutral_score ?? -Infinity) - (a.neutral_score ?? -Infinity))[0]
                          : null
                        const aiLine = phase3RoundFeedback(rr, chooseSet, req)
                        return (
                          <div key={`r-${rr.round}`} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                            <div className="mb-2 font-bold text-gray-900">Round {rr.round}</div>
                            <div className="grid gap-2">
                              {(chooseSet?.candidates ?? []).map((cand) => {
                                const picked = rr.playerPickId === cand.microbe.id
                                const isOptimal = cand.classification === "optimal"
                                const isBestNeutral = !rr.optimalId && bestNeutral?.microbe.id === cand.microbe.id
                                const cardClass = isOptimal
                                  ? "border-emerald-500 bg-emerald-50"
                                  : isBestNeutral
                                    ? "border-amber-400 bg-amber-50"
                                    : "border-gray-200 bg-white"
                                return (
                                  <div key={`${rr.round}-${cand.microbe.id}`} className={`rounded-md border px-2 py-2 ${cardClass} ${picked ? "border-blue-400 ring-1 ring-blue-300" : ""}`}>
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="truncate text-xs font-bold text-gray-900">{cand.microbe.name}</p>
                                      <div className="flex items-center gap-1">
                                        {picked ? <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">YOUR PICK</span> : null}
                                        <span
                                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                            cand.classification === "optimal"
                                              ? "bg-emerald-200 text-emerald-800"
                                              : cand.classification === "neutral"
                                                ? "bg-amber-200 text-amber-800"
                                                : "bg-red-200 text-red-800"
                                          }`}
                                        >
                                          {cand.classification}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
                                      <span className="inline-flex items-center gap-1">
                                        <span className="inline-flex">{attributeKeyIcon("Mobility")}</span>
                                        <span>Mobility: {cand.microbe.Mobility}</span>
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        <span className="inline-flex">{attributeKeyIcon("Agility")}</span>
                                        <span>Agility: {cand.microbe.Agility}</span>
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        <span className="inline-flex">{attributeKeyIcon("Size")}</span>
                                        <span>Size: {cand.microbe.Size}</span>
                                      </span>
                                      <TraitBadgeChip trait={cand.microbe.trait} chipClassName="h-5 w-5" />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <p className="text-xs text-gray-700">Round {rr.round}: {aiLine}</p>
                              {rr.deduction > 0 ? (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">-{rr.deduction}</span>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm">
                      <span className="font-semibold text-gray-900">Pool quality:</span>
                      <span className="ml-2 rounded-md bg-white px-2 py-1 font-semibold text-gray-900 ring-1 ring-gray-200">
                        Original max: <span className="tabular-nums text-base">{s.phase3.originalMaxScore}</span>
                      </span>
                      <span className="ml-2 rounded-md bg-white px-2 py-1 font-semibold text-gray-900 ring-1 ring-gray-200">
                        Your max: <span className="tabular-nums text-base">{s.phase3.playerPoolMaxScore}</span>
                      </span>
                      <span className="ml-2 rounded-md bg-red-100 px-2 py-1 font-semibold text-red-700 ring-1 ring-red-200">
                        Penalty: <span className="tabular-nums">{Math.round(s.phase3.poolQualityPenalty * 100) / 100}</span>
                      </span>
                    </div>
                  </section>

                  {/* Phase 4 — SimulatorResult treatment layout */}
                  <section className={sectionCard}>
                    <div className="mb-4 inline-flex rounded-full bg-[#eefcfb] px-3 py-1 text-sm font-semibold text-[#0f766e] ring-1 ring-[#cceeea]">
                      Phase 4 · Treatment · {s.phase4.score}/100 (<span className={gameResultsScoreDisplayColorClass(s.phase4.percentage)}>{Math.round(s.phase4.percentage)}%</span>)
                    </div>
                    <div
                      className="flex flex-col gap-6 lg:grid lg:items-stretch lg:gap-8"
                      style={{ gridTemplateColumns: "65% 35%" }}
                    >
                      <div className="min-w-0">
                        <h2 className={`mb-4 ${accentHeading}`}>Site &amp; Your Selection</h2>
                        <p className="mb-3 text-sm text-gray-600">
                          <span className="font-medium text-[#1a202c]">{req.name}</span>
                        </p>
                        <div className="mb-6 flex flex-wrap gap-2">
                          <span className="inline-flex rounded-full border border-[#cceeea] bg-[#eefcfb] px-2.5 py-1 text-xs font-medium text-[#1a202c]">
                            Mobility {req.attributes.Mobility.min}–{req.attributes.Mobility.max}
                          </span>
                          <span className="inline-flex rounded-full border border-[#cceeea] bg-[#eefcfb] px-2.5 py-1 text-xs font-medium text-[#1a202c]">
                            Agility {req.attributes.Agility.min}–{req.attributes.Agility.max}
                          </span>
                          <span className="inline-flex rounded-full border border-[#cceeea] bg-[#eefcfb] px-2.5 py-1 text-xs font-medium text-[#1a202c]">
                            Size {req.attributes.Size.min}–{req.attributes.Size.max}
                          </span>
                          <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                            Desired: {req.desired_trait}
                          </span>
                          <span className="inline-flex rounded-full border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800">
                            Undesired: {req.undesired_trait}
                          </span>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                          {s.phase4.selectedMicrobes.map((raw) => {
                            const m = raw as Microbe
                            const cat = categorizeMicrobeForResults(m, req)
                            const badgeTone =
                              cat.category === "positive"
                                ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                                : cat.category === "negative"
                                  ? "bg-red-100 text-red-800 ring-1 ring-red-200"
                                  : "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
                            const categoryLabel =
                              cat.category === "positive"
                                ? "Positive"
                                : cat.category === "negative"
                                  ? "Negative"
                                  : "Neutral"
                            const inv = getInviableAttributes(m, req)
                            return (
                              <div
                                key={m.id ?? microbeResultKey(m)}
                                className="flex min-w-[180px] flex-1 basis-[calc(33.333%-0.5rem)] flex-col rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm"
                              >
                                <p className="line-clamp-2 text-base font-bold text-[#1a202c]">{m.name ?? "Microbe"}</p>
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

                      <div className="flex h-full min-h-0 min-w-0 flex-col">
                        <h2 className={`mb-4 shrink-0 ${accentHeading}`}>Condition Checklist</h2>
                        <ul className="flex min-h-0 flex-1 flex-col gap-1 rounded-xl border border-[#e2e8f0] bg-[#f8fffe] p-3">
                          {checklistRows.map((row) => (
                            <li
                              key={row.label}
                              className={`flex min-h-0 flex-1 flex-col gap-0.5 rounded-lg border px-2 py-1 sm:flex-row sm:items-center sm:gap-2 ${row.pass ? "border-[#e2e8f0] border-l-4 border-l-[#4ECDC4] bg-white" : "border-red-200 bg-red-50/50"}`}
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
                              <span
                                className={`shrink-0 text-sm font-medium ${row.pass ? "text-emerald-600" : "text-red-600"}`}
                              >
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
                    </div>
                  </section>

                  <section>
                    <h2 className={`mb-6 ${accentHeading}`}>🏆 Optimal Combination</h2>
                    {playerFoundOptimal ? (
                      <p className="mb-4 text-base font-semibold text-emerald-600">🎉 You found the optimal combination!</p>
                    ) : null}
                    <div className={`mx-auto ${sectionCard}`}>
                      <div className="mt-6 grid w-full gap-4 [grid-template-columns:repeat(5,1fr)]">
                        {Array.from({ length: GRID_SLOTS }, (__, idx) => {
                          const m = pool[idx]
                          if (!m) {
                            return (
                              <div
                                key={`result-empty-game-${siteIdx}-${idx}`}
                                className="min-h-[140px] w-full min-w-[160px] rounded-xl bg-gray-50"
                                aria-hidden
                              />
                            )
                          }
                          const isOptimalMicrobe = optimalMemberKeys.has(microbeResultKey(m))
                          const isPlayerSelected = selectedKeys.has(microbeResultKey(m))
                          return (
                            <div
                              key={m.id}
                              className={`relative flex min-h-[140px] w-full min-w-[160px] flex-col overflow-visible rounded-xl border-2 bg-white p-2 shadow-md ${
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
                      <p
                        className={`mt-4 border-t border-[#e2e8f0] pt-4 text-lg tabular-nums ${gameResultsOptimalScoreLineClass(s.phase4.optimalScore)}`}
                      >
                        Your score: {s.phase4.optimalScore}/100
                      </p>
                    </div>
                  </section>
                </div>
              </details>
            )
          })}
        </div>

        {siteDetail.some((e) => e.site.phase4.optimalScore < 100) ? (
          <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-gray-500">
            Note: perfect scores (100) are not always achievable. The max possible score shown reflects the best achievable result for
            each pool.
          </p>
        ) : null}
      </div>
    </div>
  )
}
