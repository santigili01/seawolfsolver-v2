"use client"

import type { Phase4Score } from "@/lib/game-scoring"
import type { Microbe, ScenarioRequirements } from "@/lib/game-types"
import { buildGamePhase4Checklist, gameResultsScoreDisplayColorClass } from "@/lib/game-helpers"
import { MICROBE_PALETTE, microbeComponents, TraitBadgeChip } from "@/lib/game-visuals"

const FLOAT_MICROBES: Microbe[] = [
  {
    id: "landing-float-1",
    name: "Cyro Bacillus",
    Mobility: 7,
    Agility: 5,
    Size: 3,
    trait: "Biofilm-forming",
  },
  {
    id: "landing-float-2",
    name: "Thermo Vex",
    Mobility: 4,
    Agility: 8,
    Size: 6,
    trait: "Thermophilic",
  },
  {
    id: "landing-float-3",
    name: "Halo Zoan",
    Mobility: 2,
    Agility: 6,
    Size: 9,
    trait: "Halophobic",
  },
]

const HERO_SCENARIO: ScenarioRequirements = {
  id: 0,
  name: "Landing preview",
  attributes: {
    Mobility: { min: 5, max: 8 },
    Agility: { min: 3, max: 7 },
    Size: { min: 6, max: 9 },
  },
  desired_trait: "Thermophilic",
  undesired_trait: "Halophobic",
}

const HERO_P4: Phase4Score = {
  score: 95,
  percentage: 92,
  conditionResults: {
    mobilityInRange: true,
    agilityInRange: true,
    sizeInRange: true,
    desiredTraitPresent: true,
    undesiredTraitAbsent: true,
  },
  selectedMicrobes: [
    { Mobility: 6, Agility: 5, Size: 7, trait: "Thermophilic" },
    { Mobility: 7, Agility: 4, Size: 7, trait: "Thermophilic" },
    { Mobility: 5, Agility: 5, Size: 8, trait: "Metal-tolerant" },
  ],
  optimalCombination: [
    { Mobility: 6, Agility: 5, Size: 7, trait: "Thermophilic" },
    { Mobility: 7, Agility: 4, Size: 7, trait: "Thermophilic" },
    { Mobility: 5, Agility: 5, Size: 8, trait: "Metal-tolerant" },
  ],
  optimalScore: 100,
}

const accentHeading = "border-l-4 border-[#4ECDC4] pl-3 text-lg font-bold text-[#1a202c]"
const statCard =
  "rounded-xl border border-[#e2e8f0] border-l-4 border-l-[#4ECDC4] bg-white p-5 text-center shadow-sm"

const CARD_STACK_TRANSFORMS = [
  "translate-x-2 -rotate-2",
  "-translate-x-1 rotate-[1deg]",
  "translate-x-3 -rotate-1",
] as const

function HeroFloatingMicrobeMiniCard({ microbe, stackIndex }: { microbe: Microbe; stackIndex: number }) {
  const Svg = microbeComponents[stackIndex % microbeComponents.length]!
  const color = MICROBE_PALETTE[stackIndex % MICROBE_PALETTE.length] ?? "#808080"
  const transform = CARD_STACK_TRANSFORMS[stackIndex] ?? CARD_STACK_TRANSFORMS[0]

  return (
    <div
      role="presentation"
      className={`relative w-full max-w-[150px] rounded-xl border border-border bg-white p-3 shadow-md ${transform}`}
    >
      <p className="mb-2 text-center text-sm font-semibold text-foreground">{microbe.name}</p>
      <div className="mb-2 flex justify-center [&>svg]:h-12 [&>svg]:w-12 [&>svg]:max-h-14 [&>svg]:max-w-14">
        <Svg color={color} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Mobility</span>
          <span className="tabular-nums font-medium text-foreground">{microbe.Mobility}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Agility</span>
          <span className="tabular-nums font-medium text-foreground">{microbe.Agility}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Size</span>
          <span className="tabular-nums font-medium text-foreground">{microbe.Size}</span>
        </div>
      </div>
      <div className="mt-2 flex w-full flex-col items-center justify-center gap-1">
        <TraitBadgeChip trait={microbe.trait} chipClassName="h-8 w-8 shrink-0" />
      </div>
    </div>
  )
}

function HeroFloatingMicrobeCardStack() {
  return (
    <div className="flex w-[150px] max-w-[150px] flex-col">
      {FLOAT_MICROBES.map((m, i) => (
        <div key={m.id} className={i > 0 ? "-mt-10" : ""}>
          <HeroFloatingMicrobeMiniCard microbe={m} stackIndex={i} />
        </div>
      ))}
    </div>
  )
}

function HeroFloatingResultsPanel() {
  const checklistRows = buildGamePhase4Checklist(HERO_P4, HERO_SCENARIO)
  const scoreHuePct =
    HERO_P4.optimalScore > 0
      ? Math.min(100, Math.round((HERO_P4.score / HERO_P4.optimalScore) * 100))
      : Math.round(HERO_P4.percentage)

  return (
    <div className="flex w-full flex-col gap-3">
      <div className={statCard}>
        <p className="text-sm font-medium text-gray-500">Treatment Score</p>
        <p
          className={`mt-1 text-3xl font-bold tabular-nums sm:text-4xl ${gameResultsScoreDisplayColorClass(scoreHuePct)}`}
        >
          {HERO_P4.score}/{HERO_P4.optimalScore}
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Vs. optimal max for this pool ·{" "}
          <span className={`font-semibold ${gameResultsScoreDisplayColorClass(Math.round(HERO_P4.percentage))}`}>
            {Math.round(HERO_P4.percentage)}%
          </span>
        </p>
      </div>
      <div className="rounded-xl border border-[#e2e8f0] bg-white p-3 shadow-sm">
        <h2 className={`mb-3 ${accentHeading}`}>Conditions</h2>
        <ul className="flex flex-col gap-1 rounded-xl border border-[#e2e8f0] bg-[#f8fffe] p-2">
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
              <span className={`min-w-0 shrink-0 text-xs font-medium sm:text-sm ${row.pass ? "text-emerald-600" : "text-red-600"}`}>
                {row.label}
              </span>
              {"detail" in row && row.detail ? (
                <span
                  className={`min-w-0 break-words text-[10px] sm:ml-auto sm:text-[11px] ${row.pass ? "text-emerald-700" : "text-red-700"}`}
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
  )
}

/** Decorative microbe stack (left) and results checklist (right). Hidden below `xl`. */
export function HeroFloatingGameUi() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] hidden overflow-visible xl:block" aria-hidden>
      <div className="pointer-events-none absolute top-1/2 left-4 max-w-[160px] -translate-y-1/2 opacity-90 xl:left-8">
        <HeroFloatingMicrobeCardStack />
      </div>
      <div className="pointer-events-none absolute top-1/2 right-4 max-w-[160px] -translate-y-1/2 rotate-3 opacity-90 shadow-lg xl:right-8">
        <HeroFloatingResultsPanel />
      </div>
    </div>
  )
}
