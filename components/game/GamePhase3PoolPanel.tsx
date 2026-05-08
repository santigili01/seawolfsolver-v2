"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, HelpCircle, Star } from "lucide-react"
import {
  combinations3,
  scorePhase3,
  scorePhase4,
  type Phase3Candidate,
  type Phase4MicrobeInput,
} from "@/lib/game-scoring"
import {
  DEV_MODE,
  DEV_SKIP_BTN_CLASS,
  devPhase3AutoPool,
  prospectToPhase3Input,
  scenarioToSiteReq,
  traitColor,
} from "@/lib/game-helpers"
import { GRID_SLOTS, TOTAL_P3_ROUNDS, type Microbe, type ProspectScenarioJson, type ScenarioRequirements } from "@/lib/game-types"
import {
  MICROBE_PALETTE,
  MicrobeBlob1,
  MicrobeAttributeRow,
  assignUniqueSvgIndices,
  attributeKeyIcon,
  microbeComponents,
  SlotAttributeRow,
  TraitBadgeChip,
  traitIcon,
} from "@/lib/game-visuals"
import { GameHelpModal } from "@/components/game/GameHelpModal"

export function GamePhase3PoolPanel({
  prospect,
  scenario,
  displaySiteNum,
  attributesListForKey,
  scenariosFileTraits,
  onComplete,
}: {
  prospect: ProspectScenarioJson
  scenario: ScenarioRequirements
  displaySiteNum: number
  attributesListForKey: string[]
  scenariosFileTraits: string[]
  onComplete: (score: import("@/lib/game-scoring").Phase3Score, pool: Microbe[], svgMap: Map<string, number>) => void
}) {
  const [pool, setPool] = useState<Microbe[]>(() => [...prospect.preloaded_microbes])
  const [roundIdx, setRoundIdx] = useState(0)
  const [pickId, setPickId] = useState<string | null>(null)
  const [picks, setPicks] = useState<string[]>([])
  const [keyExpanded, setKeyExpanded] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const set = prospect.choose_sets[roundIdx]
  const allP3Microbes = useMemo(() => {
    const seen = new Map<string, Microbe>()
    for (const m of prospect.preloaded_microbes) seen.set(m.id, m)
    for (const cs of prospect.choose_sets) {
      for (const c of cs.candidates) seen.set(c.microbe.id, c.microbe)
    }
    return [...seen.values()]
  }, [prospect])
  const p3SvgMap = useMemo(() => assignUniqueSvgIndices(allP3Microbes), [allP3Microbes])

  const keyTraits = useMemo(() => {
    const inPool = new Set(pool.map((m) => m.trait))
    const ordered = scenariosFileTraits.filter((t) => inPool.has(t))
    const extras = [...inPool].filter((t) => !scenariosFileTraits.includes(t)).sort()
    return [...ordered, ...extras]
  }, [pool, scenariosFileTraits])

  const confirmRound = () => {
    if (!set || !pickId) return
    const chosen = set.candidates.find((c) => c.microbe.id === pickId)?.microbe
    if (!chosen) return
    const nextPickIds = [...picks, pickId]
    setPicks(nextPickIds)
    setPool((p) => [...p, chosen])
    setPickId(null)
    if (roundIdx >= TOTAL_P3_ROUNDS - 1) {
      const builtOrdered = [...prospect.preloaded_microbes]
      const reqPick = scenarioToSiteReq(scenario)
      for (let rIdx = 0; rIdx < nextPickIds.length; rIdx++) {
        const pid = nextPickIds[rIdx]
        const fromRound = prospect.choose_sets[rIdx]?.candidates.find((c) => c.microbe.id === pid)?.microbe
        if (fromRound) builtOrdered.push(fromRound)
      }
      const combos = combinations3([...builtOrdered] as Phase4MicrobeInput[])
      const playerPoolMaxScore =
        combos.length === 0
          ? prospect.optimal_max_score
          : Math.max(
              ...combos.map((trio) =>
                scorePhase4({
                  selectedMicrobes: trio,
                  allMicrobes: builtOrdered as Phase4MicrobeInput[],
                  req: reqPick,
                }).score,
              ),
            )

      const finalScore = scorePhase3({
        chooseSets: prospectToPhase3Input(prospect, nextPickIds),
        playerPickIds: nextPickIds,
        originalMaxScore: prospect.original_max_score,
        playerPoolMaxScore,
      })
      onComplete(finalScore, builtOrdered, p3SvgMap)
      return
    }
    setRoundIdx((r) => r + 1)
  }

  if (!set) return null

  const candidates = set.candidates
  const req = scenario

  return (
    <div className="relative min-h-[calc(100vh-6rem)] w-full overflow-y-auto pb-10">
      <div className="pointer-events-none absolute inset-0 z-[1] opacity-20">
        <div className="absolute top-20 left-20 h-48 w-32 rounded-lg bg-orange-500/30" />
        <div className="absolute top-32 left-60 h-32 w-20 rounded-lg bg-blue-400/30" />
        <div className="absolute right-40 bottom-40 h-24 w-40 rounded-lg bg-red-400/30" />
        <div className="absolute bottom-20 left-40 h-16 w-24 rounded bg-yellow-500/30" />
      </div>

      <div className="absolute top-20 left-6 z-10 w-64 rounded-xl bg-[rgba(20,20,40,0.92)] p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 font-bold text-white">S</div>
          <h2 className="font-bold text-white">Prospect Selection</h2>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm text-gray-400">Task Instructions</span>
        </div>
        <p className="mb-2 text-sm leading-relaxed text-white/90">
          Assess the 3 candidates and select the one that best strengthens your prospect pool.
        </p>
        <p className="mb-4 text-xs text-white/70">
          Round {roundIdx + 1} of {TOTAL_P3_ROUNDS}
        </p>
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="flex cursor-pointer items-center gap-2 text-blue-400 hover:text-blue-300"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
            <HelpCircle className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm">Help</span>
        </button>
      </div>

      <div className="absolute top-20 right-6 z-10 w-56 rounded-lg bg-[#FFF9C4] p-4 shadow-lg">
        <h3 className="mb-3 text-sm font-bold text-gray-800 uppercase">Site {displaySiteNum} Information</h3>
        <p className="mb-3 text-xs font-medium text-gray-700">{req.name}</p>
        <div className="mb-3">
          <div className="mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-800" />
            <span className="text-sm font-bold text-gray-800">ATTRIBUTES</span>
          </div>
          <div className="space-y-0.5 pl-3 text-sm text-gray-700">
            <p>
              Mobility: {req.attributes.Mobility.min}–{req.attributes.Mobility.max}
            </p>
            <p>
              Agility: {req.attributes.Agility.min}–{req.attributes.Agility.max}
            </p>
            <p>
              Size: {req.attributes.Size.min}–{req.attributes.Size.max}
            </p>
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-800" />
            <span className="text-sm font-bold text-gray-800">TRAIT</span>
          </div>
          <div className="space-y-2 pl-3 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-600">Desired</p>
              <p className="flex items-center gap-1 font-medium" style={{ color: traitColor(req.desired_trait) }}>
                {traitIcon(req.desired_trait, "h-3 w-3 shrink-0")}
                {req.desired_trait}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">Undesired</p>
              <p className="flex items-center gap-1 font-medium" style={{ color: traitColor(req.undesired_trait) }}>
                {traitIcon(req.undesired_trait, "h-3 w-3 shrink-0")}
                {req.undesired_trait}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-[5] mx-auto mt-4 mb-4 w-[min(900px,calc(100%-18rem))] rounded-2xl border border-white/40 bg-[rgba(235,247,245,0.88)] p-4 shadow-xl backdrop-blur-sm">
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex gap-4">
            {candidates.map((candidate, idx) => {
              const m = candidate.microbe
              const isSelected = pickId === m.id
              const anotherSelected = pickId !== null && !isSelected
              const svgIdx = p3SvgMap.get(m.id) ?? 0
              const blobColor = MICROBE_PALETTE[svgIdx % MICROBE_PALETTE.length] ?? "#808080"
              const Svg = microbeComponents[svgIdx % microbeComponents.length] ?? MicrobeBlob1
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPickId((prev) => (prev === m.id ? null : m.id))}
                  className={`flex h-[220px] w-[160px] flex-col rounded-xl border-2 bg-white p-2 text-left shadow-lg transition-all ${
                    isSelected ? "border-[#4ECDC4] bg-[#ecfdfb]" : "border-[#d1d5db]"
                  } ${anotherSelected ? "opacity-60" : "opacity-100"}`}
                >
                  <div className="mb-1 w-full text-center text-sm font-bold text-gray-800 line-clamp-1">{m.name}</div>
                  <div className="mb-1 flex shrink-0 justify-center">
                    <Svg color={blobColor} />
                  </div>
                  <div className="mt-auto flex w-full flex-col items-center gap-2 px-1">
                    <SlotAttributeRow Mobility={m.Mobility} Agility={m.Agility} Size={m.Size} />
                    <TraitBadgeChip trait={m.trait} chipClassName="h-8 w-8" />
                  </div>
                </button>
              )
            })}
          </div>
          <button
            type="button"
            disabled={!pickId}
            onClick={confirmRound}
            className={`mt-5 rounded-lg px-6 py-2 font-medium ${
              pickId ? "cursor-pointer bg-[rgba(20,30,50,0.9)] text-white hover:bg-[rgba(30,40,60,0.95)]" : "cursor-not-allowed bg-gray-500/50 text-gray-300"
            }`}
          >
            Confirm Selection
          </button>
        </div>

        <div className="relative z-10 mt-6 flex justify-center overflow-x-auto">
          <div className="grid w-[864px] gap-4 [grid-template-columns:repeat(5,160px)]">
            {Array.from({ length: GRID_SLOTS }, (_, idx) => {
              const m = pool[idx]
              if (!m) {
                return (
                  <div
                    key={`pool-empty-${idx}`}
                    className="h-[160px] w-[160px] rounded-xl border-2 border-dashed border-gray-300 bg-white/40"
                  />
                )
              }
              const svgIdx = p3SvgMap.get(m.id) ?? 0
              const blobColor = MICROBE_PALETTE[svgIdx % MICROBE_PALETTE.length] ?? "#808080"
              const Svg = microbeComponents[svgIdx % microbeComponents.length] ?? MicrobeBlob1
              return (
                <div
                  key={m.id}
                  className="flex h-[160px] w-[160px] cursor-default flex-col rounded-xl border-2 border-[#d1d5db] bg-white p-2 text-left shadow-lg"
                >
                  <div className="mb-1 w-full text-center text-sm font-bold text-gray-800 line-clamp-1">{m.name}</div>
                  <div className="mb-1 flex shrink-0 justify-center">
                    <Svg color={blobColor} />
                  </div>
                  <div className="mt-auto flex w-full items-center justify-between gap-1 px-1">
                    <MicrobeAttributeRow Mobility={m.Mobility} Agility={m.Agility} Size={m.Size} />
                    <TraitBadgeChip trait={m.trait} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="absolute right-6 bottom-8 z-20">
        <div className={`overflow-hidden rounded-xl bg-[rgba(20,30,50,0.92)] backdrop-blur-sm ${keyExpanded ? "w-48" : "w-20"}`}>
          <button type="button" onClick={() => setKeyExpanded((v) => !v)} className="flex w-full items-center justify-between px-4 py-2 text-white">
            <span>Key</span>
            {keyExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          {keyExpanded ? (
            <div className="space-y-3 px-4 pb-4">
              <div>
                <p className="mb-1 text-xs text-gray-400">Attributes</p>
                <div className="space-y-1 text-sm text-white">
                  {attributesListForKey.map((attr) => (
                    <div key={attr} className="flex items-center gap-2">
                      {attributeKeyIcon(attr)}
                      <span>{attr}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-400">Traits</p>
                <div className="space-y-1 text-sm text-white">
                  {keyTraits.map((trait) => (
                    <div key={trait} className="flex items-center gap-2">
                      <div style={{ color: traitColor(trait) }}>{traitIcon(trait, "h-4 w-4 shrink-0")}</div>
                      <span>{trait}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <select className="sr-only" value={scenario.name} disabled aria-hidden>
        {keyTraits.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>

      {DEV_MODE ? (
        <button
          type="button"
          className={DEV_SKIP_BTN_CLASS}
          onClick={() => {
            const { score, pool: p } = devPhase3AutoPool(prospect, scenario)
            onComplete(score, p, p3SvgMap)
          }}
        >
          Skip →
        </button>
      ) : null}
      <GameHelpModal open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}
