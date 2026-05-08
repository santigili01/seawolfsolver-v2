"use client"

import { useMemo, useRef, useState } from "react"
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
import type { PhaseBehaviourData } from "@/lib/behavioural-scoring"
import {
  GAME_HELPER_CARD_CLASS,
  GAME_KEY_PANEL_OUTER_CLASS,
  GAME_KEY_TOGGLE_BTN_CLASS,
  GAME_MAIN_PANEL_P3_CLASS,
  GAME_PHASE_ROOT_CLASS,
  GAME_SITE_INFO_CARD_CLASS,
  gameKeyPanelInnerClass,
} from "@/lib/game-phase-layout"

export function GamePhase3PoolPanel({
  prospect,
  scenario,
  displaySiteNum,
  attributesListForKey,
  scenariosFileTraits,
  onBehaviourData,
  onComplete,
}: {
  prospect: ProspectScenarioJson
  scenario: ScenarioRequirements
  displaySiteNum: number
  attributesListForKey: string[]
  scenariosFileTraits: string[]
  onBehaviourData: (d: PhaseBehaviourData) => void
  onComplete: (score: import("@/lib/game-scoring").Phase3Score, pool: Microbe[], svgMap: Map<string, number>) => void
}) {
  const [pool, setPool] = useState<Microbe[]>(() => [...prospect.preloaded_microbes])
  const [roundIdx, setRoundIdx] = useState(0)
  const [pickId, setPickId] = useState<string | null>(null)
  const [picks, setPicks] = useState<string[]>([])
  const [keyExpanded, setKeyExpanded] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const clickCountRef = useRef(0)
  const switchCountRef = useRef(0)
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
    clickCountRef.current += 1
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
      onBehaviourData({
        phase: "phase3",
        siteNumber: displaySiteNum as 1 | 2 | 3,
        clickCount: clickCountRef.current,
        minClicks: 8,
        answerSwitches: switchCountRef.current,
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
    <div className={GAME_PHASE_ROOT_CLASS}>
      <div className="pointer-events-none absolute inset-0 z-[1] opacity-20">
        <div className="absolute top-20 left-20 h-48 w-32 rounded-lg bg-orange-500/30" />
        <div className="absolute top-32 left-60 h-32 w-20 rounded-lg bg-blue-400/30" />
        <div className="absolute right-40 bottom-40 h-24 w-40 rounded-lg bg-red-400/30" />
        <div className="absolute bottom-20 left-40 h-16 w-24 rounded bg-yellow-500/30" />
      </div>

      <div className={GAME_HELPER_CARD_CLASS}>
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

      <div className={GAME_SITE_INFO_CARD_CLASS}>
        <h3 className="mb-2 text-sm font-bold text-gray-800 uppercase">Site {displaySiteNum} Information</h3>
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

      <div className={GAME_MAIN_PANEL_P3_CLASS}>
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex gap-3">
            {candidates.map((candidate) => {
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
                  onClick={() =>
                    setPickId((prev) => {
                      clickCountRef.current += 1
                      const next = prev === m.id ? null : m.id
                      if (prev !== null && next !== null && prev !== next) switchCountRef.current += 1
                      return next
                    })
                  }
                  className={`flex h-[152px] w-[126px] shrink-0 flex-col rounded-xl border-2 bg-white p-1.5 text-left shadow-md transition-all ${
                    isSelected ? "border-[#4ECDC4] bg-[#ecfdfb]" : "border-[#d1d5db]"
                  } ${anotherSelected ? "opacity-60" : "opacity-100"}`}
                >
                  <div className="mb-0.5 w-full text-center text-[11px] font-bold leading-tight text-gray-800 line-clamp-2">{m.name}</div>
                  <div className="flex max-h-[52px] min-h-[52px] shrink-0 items-center justify-center [&>svg]:max-h-[52px] [&>svg]:max-w-[52px] [&>svg]:overflow-visible">
                    <Svg color={blobColor} />
                  </div>
                  <div className="mt-auto flex w-full flex-col items-center gap-1 px-0.5">
                    <SlotAttributeRow Mobility={m.Mobility} Agility={m.Agility} Size={m.Size} />
                    <TraitBadgeChip trait={m.trait} chipClassName="h-6 w-6" />
                  </div>
                </button>
              )
            })}
          </div>
          <button
            type="button"
            disabled={!pickId}
            onClick={confirmRound}
            className={`mt-3 rounded-lg px-5 py-1.5 text-sm font-medium ${
              pickId ? "cursor-pointer bg-[rgba(20,30,50,0.9)] text-white hover:bg-[rgba(30,40,60,0.95)]" : "cursor-not-allowed bg-gray-500/50 text-gray-300"
            }`}
          >
            Confirm Selection
          </button>
        </div>

        <div className="relative z-10 mt-4 flex justify-center overflow-x-auto pb-1">
          <div className="grid gap-3 [grid-template-columns:repeat(5,124px)]">
            {Array.from({ length: GRID_SLOTS }, (_, idx) => {
              const m = pool[idx]
              if (!m) {
                return (
                  <div
                    key={`pool-empty-${idx}`}
                    className="h-[124px] w-[124px] rounded-lg border-2 border-dashed border-gray-300 bg-white/40"
                  />
                )
              }
              const svgIdx = p3SvgMap.get(m.id) ?? 0
              const blobColor = MICROBE_PALETTE[svgIdx % MICROBE_PALETTE.length] ?? "#808080"
              const Svg = microbeComponents[svgIdx % microbeComponents.length] ?? MicrobeBlob1
              return (
                <div
                  key={m.id}
                  className="flex h-[124px] w-[124px] cursor-default flex-col rounded-lg border-2 border-[#d1d5db] bg-white p-1.5 text-left shadow-md"
                >
                  <div className="mb-0.5 w-full text-center text-[11px] font-bold leading-tight text-gray-800 line-clamp-2">{m.name}</div>
                  <div className="flex max-h-[44px] min-h-[44px] shrink-0 items-center justify-center [&>svg]:max-h-[44px] [&>svg]:max-w-[44px]">
                    <Svg color={blobColor} />
                  </div>
                  <div className="mt-auto flex w-full items-center justify-between gap-0.5 px-0.5">
                    <MicrobeAttributeRow Mobility={m.Mobility} Agility={m.Agility} Size={m.Size} />
                    <TraitBadgeChip trait={m.trait} chipClassName="h-6 w-6" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className={GAME_KEY_PANEL_OUTER_CLASS}>
        <div className={gameKeyPanelInnerClass(keyExpanded)}>
          <button type="button" onClick={() => setKeyExpanded((v) => !v)} className={GAME_KEY_TOGGLE_BTN_CLASS}>
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
            clickCountRef.current += 1
            const { score, pool: p } = devPhase3AutoPool(prospect, scenario)
            onBehaviourData({
              phase: "phase3",
              siteNumber: displaySiteNum as 1 | 2 | 3,
              clickCount: clickCountRef.current,
              minClicks: 8,
              answerSwitches: switchCountRef.current,
            })
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
