"use client"

import { useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronUp, HelpCircle, Star } from "lucide-react"
import {
  scorePhase4,
  type Phase4MicrobeInput,
  type Phase4Score,
} from "@/lib/game-scoring"
import {
  DEV_SKIP_BTN_CLASS,
  DEV_MODE,
  devScoreAtPct75,
  getInviableAttributes,
  scenarioToSiteReq,
  traitColor,
} from "@/lib/game-helpers"
import { GRID_SLOTS, type Microbe, type ScenarioRequirements } from "@/lib/game-types"
import {
  MicrobeAttributeRow,
  MICROBE_PALETTE,
  MicrobeBlob1,
  microbeComponents,
  SlotAttributeRow,
  SlotTraitBadge,
  TraitBadgeChip,
  attributeKeyIcon,
  traitIcon,
} from "@/lib/game-visuals"
import { GameHelpModal } from "@/components/game/GameHelpModal"
import { SimulatorScaleStage } from "@/components/game/SimulatorScaleStage"
import type { PhaseBehaviourData } from "@/lib/behavioural-scoring"
import {
  GAME_HELPER_CARD_CLASS,
  GAME_KEY_PANEL_OUTER_CLASS,
  GAME_KEY_TOGGLE_BTN_CLASS,
  GAME_MAIN_PANEL_FLOW_TEAL_CLASS,
  GAME_PHASE_ROOT_CLASS,
  GAME_SITE_INFO_CARD_CLASS,
  gameKeyPanelInnerClass,
} from "@/lib/game-phase-layout"

export function GamePhase4TreatmentPanel({
  builtPool,
  svgMap,
  scenario,
  displaySiteNum,
  attributesListForKey,
  scenariosFileTraits,
  onBehaviourData,
  onComplete,
}: {
  builtPool: Microbe[]
  svgMap: Map<string, number>
  scenario: ScenarioRequirements
  displaySiteNum: number
  attributesListForKey: string[]
  scenariosFileTraits: string[]
  onBehaviourData: (d: PhaseBehaviourData) => void
  onComplete: (s: Phase4Score) => void
}) {
  const [selected, setSelected] = useState<Microbe[]>([])
  const [keyExpanded, setKeyExpanded] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const clickCountRef = useRef(0)
  const switchCountRef = useRef(0)
  const combinationsTriedRef = useRef(0)
  const pendingReplacementRef = useRef(0)
  const microbes = builtPool.slice(0, GRID_SLOTS)

  const keyTraits = useMemo(() => {
    const inPool = new Set(microbes.map((m) => m.trait))
    const ordered = scenariosFileTraits.filter((t) => inPool.has(t))
    const extras = [...inPool].filter((t) => !scenariosFileTraits.includes(t)).sort()
    return [...ordered, ...extras]
  }, [microbes, scenariosFileTraits])

  const selectedIds = useMemo(() => new Set(selected.map((m) => m.id)), [selected])

  /** Keeps grid column alignment when a slot has no microbe (unexpected if pool is full). */
  const trayReserveClass =
    "min-h-[168px] min-w-0 w-full opacity-0 pointer-events-none shrink-0"

  const togglePick = (m: Microbe) => {
    clickCountRef.current += 1
    setSelected((prev) => {
      if (prev.some((x) => x.id === m.id)) {
        pendingReplacementRef.current += 1
        return prev.filter((x) => x.id !== m.id)
      }
      if (prev.length >= 3) return prev
      if (pendingReplacementRef.current > 0) {
        switchCountRef.current += 1
        pendingReplacementRef.current -= 1
      }
      return [...prev, m]
    })
  }

  const removeMicrobeId = (id: string) => {
    clickCountRef.current += 1
    pendingReplacementRef.current += 1
    setSelected((prev) => prev.filter((x) => x.id !== id))
  }

  const submit = () => {
    clickCountRef.current += 1
    if (selected.length !== 3) return
    combinationsTriedRef.current += 1
    const trapMicrobesSelected = selected.filter((m) => {
      const undesired = m.trait === scenario.undesired_trait
      const inviable = getInviableAttributes(m, scenario).length > 0
      return undesired || inviable
    }).length
    const s = scorePhase4({
      selectedMicrobes: selected as Phase4MicrobeInput[],
      allMicrobes: microbes as Phase4MicrobeInput[],
      req: scenarioToSiteReq(scenario),
    })
    onBehaviourData({
      phase: "phase4",
      siteNumber: displaySiteNum as 1 | 2 | 3,
      clickCount: clickCountRef.current,
      minClicks: 4,
      answerSwitches: switchCountRef.current,
      combinationsTried: combinationsTriedRef.current,
      trapMicrobesSelected,
    })
    onComplete(s)
  }

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
          <h2 className="font-bold text-white">Treatment Selection</h2>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm text-gray-400">Task Instructions</span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-white/90">
          <span className="font-semibold">Identify the 3 microbes </span> whose combined attributes and traits most closely satisfy
          this site&apos;s treatment conditions.
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

      <div className={GAME_MAIN_PANEL_FLOW_TEAL_CLASS}>
        <SimulatorScaleStage designWidth={880} className="min-h-0 flex-1">
        <div className="relative z-10 flex w-full flex-col items-stretch">
          {/* Same width as one tray column; compact SlotAttributeRow layout; slightly taller than tray rows. */}
          <div className="flex w-full justify-center gap-3">
            {[0, 1, 2].map((slotIndex) => {
              const sel = selected[slotIndex]
              if (!sel) {
                return (
                  <div
                    key={`slot-empty-${slotIndex}`}
                    className="flex min-h-[178px] w-[calc((100%-3rem)/5)] shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-white/50 bg-white/30 transition-all hover:bg-white/40"
                    aria-label={`Selection slot empty ${slotIndex + 1}`}
                  >
                    <span className="h-8 w-8 shrink-0 rounded border-2 border-dashed border-white/40" aria-hidden />
                  </div>
                )
              }
              const svgIdx = svgMap.get(sel.id) ?? 0
              const col = MICROBE_PALETTE[svgIdx % MICROBE_PALETTE.length] ?? "#808080"
              const Svg = microbeComponents[svgIdx % microbeComponents.length] ?? MicrobeBlob1
              return (
                <div
                  key={`${sel.id}-slot-${slotIndex}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => removeMicrobeId(sel.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      removeMicrobeId(sel.id)
                    }
                  }}
                  className="relative flex min-h-[178px] w-[calc((100%-3rem)/5)] shrink-0 cursor-pointer flex-col items-center rounded-xl border-2 border-solid border-blue-400 bg-white text-center shadow-lg"
                >
                  <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-between gap-1 px-1.5 py-1.5 text-center">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center [&>svg]:block [&>svg]:h-full [&>svg]:w-full [&>svg]:max-h-full [&>svg]:max-w-full">
                      <Svg color={col} />
                    </div>
                    <p className="line-clamp-2 w-full text-center text-sm font-bold leading-tight text-gray-800 sm:text-base">{sel.name}</p>
                    <div className="flex w-full flex-col items-center text-center">
                      <SlotAttributeRow Mobility={sel.Mobility} Agility={sel.Agility} Size={sel.Size} />
                      <SlotTraitBadge trait={sel.trait} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <button
            type="button"
            disabled={selected.length !== 3}
            onClick={submit}
            className={`mt-3 self-center rounded-lg px-5 py-2 text-base font-medium transition-all ${
              selected.length === 3
                ? "cursor-pointer bg-[rgba(20,30,50,0.9)] text-white hover:bg-[rgba(30,40,60,0.95)]"
                : "cursor-not-allowed bg-gray-500/50 text-gray-300"
            }`}
          >
            Submit Treatment
          </button>
        </div>

        <div className="relative z-10 mt-4 w-full pb-1">
          <div className="grid w-full grid-cols-5 gap-3">
            {Array.from({ length: GRID_SLOTS }, (_, idx) => {
              const microbe = microbes[idx]
              if (!microbe) {
                return <div key={`cell-${idx}`} className={trayReserveClass} aria-hidden />
              }
              const svgIdx = svgMap.get(microbe.id) ?? 0
              const MicrobeSvg = microbeComponents[svgIdx % microbeComponents.length] ?? MicrobeBlob1
              const blobColor = MICROBE_PALETTE[svgIdx % MICROBE_PALETTE.length] ?? "#808080"
              const isSel = selectedIds.has(microbe.id)
              if (isSel) {
                return (
                  <div
                    key={microbe.id}
                    className="min-h-[168px] w-full min-w-0 rounded-lg border-2 border-dashed border-white/40 bg-white/25"
                  />
                )
              }
              return (
                <button
                  key={microbe.id}
                  type="button"
                  disabled={selected.length >= 3}
                  className="flex min-h-[168px] h-auto w-full min-w-0 cursor-pointer flex-col rounded-lg border-2 border-[#d1d5db] bg-white p-2 text-left shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => togglePick(microbe)}
                >
                  <div className="mb-0.5 w-full text-center text-xs font-bold leading-tight text-gray-800 sm:text-sm line-clamp-2">
                    {microbe.name}
                  </div>
                  <div className="flex max-h-[56px] min-h-[56px] shrink-0 items-center justify-center [&>svg]:max-h-[56px] [&>svg]:max-w-[56px]">
                    <MicrobeSvg color={blobColor} />
                  </div>
                  <div className="mt-auto flex w-full min-w-0 items-center justify-between gap-1">
                    <MicrobeAttributeRow layout="nowrap" Mobility={microbe.Mobility} Agility={microbe.Agility} Size={microbe.Size} />
                    <TraitBadgeChip trait={microbe.trait} chipClassName="h-6 w-6 shrink-0" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        </SimulatorScaleStage>
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
        {[1, 2, 3].map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>

      {DEV_MODE && microbes.length >= 3 ? (
        <button
          type="button"
          className={DEV_SKIP_BTN_CLASS}
          onClick={() => {
            clickCountRef.current += 1
            combinationsTriedRef.current += 1
            const devSelected = microbes.slice(0, 3)
            const trapMicrobesSelected = devSelected.filter((m) => {
              const undesired = m.trait === scenario.undesired_trait
              const inviable = getInviableAttributes(m, scenario).length > 0
              return undesired || inviable
            }).length
            const score = scorePhase4({
              selectedMicrobes: devSelected as Phase4MicrobeInput[],
              allMicrobes: microbes as Phase4MicrobeInput[],
              req: scenarioToSiteReq(scenario),
            })
            onBehaviourData({
              phase: "phase4",
              siteNumber: displaySiteNum as 1 | 2 | 3,
              clickCount: clickCountRef.current,
              minClicks: 4,
              answerSwitches: switchCountRef.current,
              combinationsTried: combinationsTriedRef.current,
              trapMicrobesSelected,
            })
            onComplete(score)
          }}
        >
          Skip →
        </button>
      ) : null}
      <GameHelpModal open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}
