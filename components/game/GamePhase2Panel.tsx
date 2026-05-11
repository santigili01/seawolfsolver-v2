"use client"

import { useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronUp, HelpCircle, Star } from "lucide-react"
import { scorePhase2, type Phase2DecisionRow } from "@/lib/game-scoring"
import {
  DEV_SKIP_BTN_CLASS,
  DEV_MODE,
  correctP2Choice,
  correctP2Reason,
  devPhase2PerfectComplete,
  formatInsightRevealLine,
  insightRevealTypeUpper,
} from "@/lib/game-helpers"
import type { CategorizationPool, Microbe, RevealedCharacteristic, ScenarioRequirements } from "@/lib/game-types"
import {
  MICROBE_PALETTE,
  MicrobeBlob1,
  assignUniqueSvgIndices,
  attributeKeyIcon,
  collapsedBlobCard,
  microbeComponents,
  SlotAttributeRow,
  TraitBadgeChip,
  traitIcon,
} from "@/lib/game-visuals"
import { traitColor } from "@/lib/game-helpers"
import { GameHelpModal } from "@/components/game/GameHelpModal"
import { SimulatorScaleStage } from "@/components/game/SimulatorScaleStage"
import type { PhaseBehaviourData } from "@/lib/behavioural-scoring"
import {
  GAME_HELPER_CARD_CLASS,
  GAME_KEY_PANEL_OUTER_CLASS,
  GAME_KEY_TOGGLE_BTN_CLASS,
  GAME_MAIN_PANEL_SPLIT_CLASS,
  GAME_PHASE_ROOT_CLASS,
  GAME_SITE_INFO_CARD_CLASS,
  gameKeyPanelInnerClass,
} from "@/lib/game-phase-layout"

export type P2Pick = "site1" | "site2" | "return"

export function GamePhase2Panel({
  pool,
  scenario,
  displaySiteNum,
  attributesListForKey,
  traitListFull,
  isLastSite,
  onBehaviourData,
  onComplete,
}: {
  pool: CategorizationPool
  scenario: ScenarioRequirements
  displaySiteNum: number
  attributesListForKey: string[]
  traitListFull: string[]
  isLastSite: boolean
  onBehaviourData: (d: PhaseBehaviourData) => void
  onComplete: (result: import("@/lib/game-scoring").Phase2Score, tagged: Microbe[], rows: Phase2DecisionRow[]) => void
}) {
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<P2Pick | null>(null)
  const [reviewMode, setReviewMode] = useState(false)
  const [decisions, setDecisions] = useState<{ id: string; choice: P2Pick }[]>([])
  const [bucketState, setBucketState] = useState<{ b1: Microbe[]; b2: Microbe[]; ret: Microbe[] }>({
    b1: [],
    b2: [],
    ret: [],
  })
  const [expandedColumnIds, setExpandedColumnIds] = useState<Set<string>>(() => new Set())
  const [keyExpanded, setKeyExpanded] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const clickCountRef = useRef(0)
  const switchCountRef = useRef(0)
  const reassignmentsRef = useRef(0)

  const displayedMicrobe = pool.microbes[idx] ?? null
  const p2SvgMap = useMemo(() => assignUniqueSvgIndices(pool.microbes), [pool.microbes])
  const ix = displayedMicrobe ? (p2SvgMap.get(displayedMicrobe.id) ?? 0) : 0
  const Svg = microbeComponents[ix % microbeComponents.length] ?? MicrobeBlob1
  const col = MICROBE_PALETTE[ix % MICROBE_PALETTE.length] ?? "#808080"

  const siteStickyReq = pool.site1_requirements
  const nextReq = pool.site2_requirements
  const revealedForInsight = pool.revealed_characteristic as RevealedCharacteristic
  const showInsightSection = Boolean(nextReq && revealedForInsight && !isLastSite)

  const site1Label = `Site ${displaySiteNum}`
  const site2Label = `Site ${displaySiteNum + 1}`

  type ColumnMicrobe = { m: Microbe; poolMs: Microbe[] }

  const columnsPhase2: { title: string; badge: string; items: ColumnMicrobe[] }[] = [
    {
      title: site1Label,
      badge: "Microbes Categorized",
      items: bucketState.b1.map((m) => ({ m, poolMs: pool.microbes })),
    },
    ...(isLastSite
      ? []
      : [
          {
            title: site2Label,
            badge: "Microbes Categorized",
            items: bucketState.b2.map((m) => ({ m, poolMs: pool.microbes })),
          },
        ]),
    {
      title: "Return",
      badge: "Microbes Returned",
      items: bucketState.ret.map((m) => ({ m, poolMs: pool.microbes })),
    },
  ]

  const toggleExpand = (uid: string) => {
    setExpandedColumnIds((prev) => {
      const n = new Set(prev)
      if (n.has(uid)) n.delete(uid)
      else n.add(uid)
      return n
    })
  }

  const keyTraits = useMemo(() => {
    const inPool = new Set(pool.microbes.map((m) => m.trait))
    const ordered = traitListFull.filter((t) => inPool.has(t))
    const extras = [...inPool].filter((t) => !traitListFull.includes(t)).sort()
    return [...ordered, ...extras]
  }, [pool.microbes, traitListFull])

  const remainingCount = Math.max(0, 10 - idx)

  function finalize(rowsDec: { id: string; choice: P2Pick }[]) {
    const rows: Phase2DecisionRow[] = rowsDec.map((d) => ({
      microbeId: d.id,
      playerChoice: d.choice,
      correctChoice: correctP2Choice(pool, d.id, isLastSite),
      reason: correctP2Reason(pool, d.id, isLastSite),
    }))
    const score = scorePhase2(rows)
    const b2: Microbe[] = []
    for (const d of rowsDec) {
      if (d.choice === "site2") {
        const m = pool.microbes.find((x) => x.id === d.id)!
        b2.push(m)
      }
    }
    onBehaviourData({
      phase: "phase2",
      siteNumber: displaySiteNum as 1 | 2 | 3,
      clickCount: clickCountRef.current,
      minClicks: 21,
      answerSwitches: switchCountRef.current,
      reassignments: reassignmentsRef.current,
    })
    onComplete(score, b2, rows)
  }

  const submitOne = () => {
    if (!displayedMicrobe || picked === null) return
    clickCountRef.current += 1
    const nextDec = [...decisions, { id: displayedMicrobe.id, choice: picked }]
    const k = picked === "site1" ? "b1" : picked === "site2" ? "b2" : "ret"
    const nextBuckets = {
      ...bucketState,
      [k]: [...bucketState[k], displayedMicrobe],
    }
    setDecisions(nextDec)
    setBucketState(nextBuckets)
    setPicked(null)

    if (idx < pool.microbes.length - 1) {
      setIdx((i) => i + 1)
      return
    }
    setReviewMode(true)
  }

  const reassignMicrobe = (microbeId: string, from: P2Pick, to: P2Pick, uid: string) => {
    reassignmentsRef.current += 1
    setBucketState((prev) => {
      const fromKey = from === "site1" ? "b1" : from === "site2" ? "b2" : "ret"
      const toKey = to === "site1" ? "b1" : to === "site2" ? "b2" : "ret"
      const microbe = prev[fromKey].find((x) => x.id === microbeId)
      if (!microbe) return prev
      return {
        ...prev,
        [fromKey]: prev[fromKey].filter((x) => x.id !== microbeId),
        [toKey]: [...prev[toKey], microbe],
      }
    })
    setDecisions((prev) => prev.map((d) => (d.id === microbeId ? { ...d, choice: to } : d)))
    setExpandedColumnIds((prev) => {
      const n = new Set(prev)
      n.delete(uid)
      return n
    })
  }

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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 font-bold text-white">P</div>
          <h2 className="font-bold text-white">Microbe Profile</h2>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm text-gray-400">Task Instructions</span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-white/90">
          <span className="font-semibold">Evaluate each microbe</span> against the available site data and assign it to the most
          appropriate destination.
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
        <p className="mb-3 text-xs font-medium text-gray-700">{scenario.name}</p>
        <div className="mb-3">
          <div className="mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-800" />
            <span className="text-sm font-bold text-gray-800">ATTRIBUTES</span>
          </div>
          <div className="space-y-0.5 pl-3 text-sm text-gray-700">
            <p>
              Mobility: {siteStickyReq.attributes.Mobility.min}–{siteStickyReq.attributes.Mobility.max}
            </p>
            <p>
              Agility: {siteStickyReq.attributes.Agility.min}–{siteStickyReq.attributes.Agility.max}
            </p>
            <p>
              Size: {siteStickyReq.attributes.Size.min}–{siteStickyReq.attributes.Size.max}
            </p>
          </div>
        </div>
        <div className="mb-3">
          <div className="mb-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-800" />
            <span className="text-sm font-bold text-gray-800">TRAIT</span>
          </div>
          <div className="space-y-2 pl-3 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-600">Desired</p>
              <p className="flex items-center gap-1 font-medium" style={{ color: traitColor(siteStickyReq.desired_trait) }}>
                {traitIcon(siteStickyReq.desired_trait, "h-3 w-3 shrink-0")}
                {siteStickyReq.desired_trait}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">Undesired</p>
              <p
                className="flex items-center gap-1 font-medium"
                style={{ color: traitColor(siteStickyReq.undesired_trait) }}
              >
                {traitIcon(siteStickyReq.undesired_trait, "h-3 w-3 shrink-0")}
                {siteStickyReq.undesired_trait}
              </p>
            </div>
          </div>
        </div>
        {showInsightSection ? (
          <div className="border-t border-amber-200/80 pt-3">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-800">
              Site {displaySiteNum + 1} Insight
            </h4>
            <p className="text-xs font-medium text-gray-600">{insightRevealTypeUpper(revealedForInsight)}</p>
            <p className="text-sm font-semibold text-gray-800">{formatInsightRevealLine(revealedForInsight)}</p>
          </div>
        ) : null}
      </div>

      <div className={GAME_MAIN_PANEL_SPLIT_CLASS}>
        <SimulatorScaleStage designWidth={920} minScale={0.62} className="flex min-h-0 min-w-0 flex-1 shrink">
          <div className="flex h-full min-h-0 w-full flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="flex w-full shrink-0 flex-col overflow-y-auto pr-1 lg:w-[200px]">
          {reviewMode ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-gray-800">All microbes categorized.</p>
              <p className="text-sm text-gray-500">
                Review your assignments in the columns. You can still reassign microbes before continuing.
              </p>
              <button
                type="button"
                onClick={() => {
                  clickCountRef.current += 1
                  finalize(decisions)
                }}
                className="w-full rounded-lg bg-[rgba(20,30,50,0.9)] py-3 text-sm font-semibold text-white hover:bg-[rgba(30,40,60,0.95)]"
              >
                Continue
              </button>
            </div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-baseline gap-2">
                <h2 className="text-lg font-bold text-gray-900">Categorize Microbes</h2>
                <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                  Microbes remaining: {remainingCount}
                </span>
              </div>

              {displayedMicrobe ? (
                <div className="flex flex-1 flex-col rounded-xl border border-gray-200 bg-gray-50/80 p-4 shadow-inner">
                  <p className="mb-3 text-center text-base font-bold text-gray-900">{displayedMicrobe.name}</p>
                  <div className="mb-3 flex justify-center [&>svg]:h-16 [&>svg]:w-16">
                    <Svg color={col} />
                  </div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Attributes</p>
                  <SlotAttributeRow
                    Mobility={displayedMicrobe.Mobility}
                    Agility={displayedMicrobe.Agility}
                    Size={displayedMicrobe.Size}
                  />
                  <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-gray-500">Trait</p>
                  <div className="flex items-center gap-2">
                    <TraitBadgeChip trait={displayedMicrobe.trait} chipClassName="h-8 w-8" />
                    <span className="text-sm font-medium" style={{ color: traitColor(displayedMicrobe.trait) }}>
                      {displayedMicrobe.trait}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nothing to categorize.</p>
              )}

              <p className="mb-2 mt-5 text-sm font-semibold text-gray-800">Select Category</p>
              <div className="flex shrink-0 flex-col gap-2">
                <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-gray-800">
                  <input
                    type="radio"
                    name="p2cat-game"
                    checked={picked === "site1"}
                    onChange={() => {
                      clickCountRef.current += 1
                      if (picked !== null && picked !== "site1") switchCountRef.current += 1
                      setPicked("site1")
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span className="min-w-0 break-words">{site1Label}</span>
                </label>
                {isLastSite ? null : (
                  <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-gray-800">
                    <input
                      type="radio"
                      name="p2cat-game"
                      checked={picked === "site2"}
                      onChange={() => {
                        clickCountRef.current += 1
                        if (picked !== null && picked !== "site2") switchCountRef.current += 1
                        setPicked("site2")
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    <span className="min-w-0 break-words">{site2Label}</span>
                  </label>
                )}
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="p2cat-game"
                    checked={picked === "return"}
                    onChange={() => {
                      clickCountRef.current += 1
                      if (picked !== null && picked !== "return") switchCountRef.current += 1
                      setPicked("return")
                    }}
                    className="h-4 w-4"
                  />
                  Return
                </label>
              </div>

              <button
                type="button"
                disabled={!displayedMicrobe || picked === null}
                onClick={submitOne}
                className={`mt-4 w-full shrink-0 rounded-lg py-3 text-sm font-semibold transition-colors ${
                  displayedMicrobe && picked !== null
                    ? "cursor-pointer bg-[rgba(20,30,50,0.9)] text-white hover:bg-[rgba(30,40,60,0.95)]"
                    : "cursor-not-allowed bg-gray-300 text-gray-500"
                }`}
              >
                Submit Selection
              </button>
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto lg:flex-row lg:gap-3 lg:overflow-hidden">
          {columnsPhase2.map((colDef) => (
            <div key={colDef.title} className="flex min-w-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white/60 p-3">
              <div className="mb-3 flex flex-col gap-1 border-b border-gray-200 pb-2">
                <h3 className="text-sm font-bold text-gray-900">{colDef.title}</h3>
                <span className="inline-flex max-w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  {colDef.badge}: {colDef.items.length}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
                {colDef.items.map(({ m, poolMs }) => {
                  const uid = `${colDef.title}-${m.id}-${m.name}`
                  const open = expandedColumnIds.has(uid)
                  const fromPick: P2Pick =
                    colDef.title === site1Label ? "site1" : colDef.title === site2Label ? "site2" : "return"
                  const targets: { pick: P2Pick; label: string }[] =
                    fromPick === "site1"
                      ? [{ pick: "return", label: "Return" }, ...(isLastSite ? [] : [{ pick: "site2" as const, label: site2Label }])]
                      : fromPick === "site2"
                        ? [
                            { pick: "site1", label: site1Label },
                            { pick: "return", label: "Return" },
                          ]
                        : [{ pick: "site1", label: site1Label }, ...(isLastSite ? [] : [{ pick: "site2" as const, label: site2Label }])]
                  return (
                    <div key={uid} className="rounded-lg border border-gray-200 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleExpand(uid)}
                        className="flex w-full items-center gap-2 px-2 py-2 text-left hover:bg-gray-50"
                      >
                        <span className="[&>svg]:block [&>svg]:h-8 [&>svg]:w-8">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden">{collapsedBlobCard(m, poolMs)}</span>
                        </span>
                        <span className="min-w-0 flex-1 text-xs leading-tight font-semibold break-words text-gray-800">{m.name}</span>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
                      </button>
                      {open ? (
                        <div className="space-y-2 border-t border-gray-100 px-3 py-3 text-sm">
                          <SlotAttributeRow Mobility={m.Mobility} Agility={m.Agility} Size={m.Size} />
                          <div className="flex items-center gap-2 pt-1">
                            <TraitBadgeChip trait={m.trait} />
                            <span style={{ color: traitColor(m.trait) }} className="text-xs font-medium">
                              {m.trait}
                            </span>
                          </div>
                          <div className="mt-2 flex gap-2">
                            {targets.map((target) => (
                              <button
                                key={`${uid}-${target.pick}`}
                                type="button"
                                onClick={() => reassignMicrobe(m.id, fromPick, target.pick, uid)}
                                className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                              >
                                Move to {target.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
          </div>
        </SimulatorScaleStage>
      </div>

      <div className={GAME_KEY_PANEL_OUTER_CLASS}>
        <div className={gameKeyPanelInnerClass(keyExpanded)}>
          <button
            type="button"
            onClick={() => setKeyExpanded(!keyExpanded)}
            className={GAME_KEY_TOGGLE_BTN_CLASS}
          >
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

      {DEV_MODE ? (
        <button
          type="button"
          className={DEV_SKIP_BTN_CLASS}
          onClick={() => {
            clickCountRef.current += 1
            const { score, tagged, rows } = devPhase2PerfectComplete(pool, isLastSite)
            onBehaviourData({
              phase: "phase2",
              siteNumber: displaySiteNum as 1 | 2 | 3,
              clickCount: clickCountRef.current,
              minClicks: 21,
              answerSwitches: switchCountRef.current,
              reassignments: reassignmentsRef.current,
            })
            onComplete(score, tagged, rows)
          }}
        >
          Skip →
        </button>
      ) : null}
      <GameHelpModal open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}
