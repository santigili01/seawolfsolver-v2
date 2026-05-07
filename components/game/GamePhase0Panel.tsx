"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, HelpCircle, Star } from "lucide-react"
import { scorePhase0, type Phase0DecisionInput } from "@/lib/game-scoring"
import {
  DEV_SKIP_BTN_CLASS,
  DEV_MODE,
  devPhase0AllKeep,
  scenarioToSiteReq,
  traitColor,
} from "@/lib/game-helpers"
import type { Microbe, ScenarioRequirements } from "@/lib/game-types"
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

export function GamePhase0Panel({
  taggedMicrobes,
  scenario,
  displaySiteNum,
  blobPalettePool,
  attributesListForKey,
  traitListFull,
  onComplete,
}: {
  taggedMicrobes: Microbe[]
  scenario: ScenarioRequirements
  displaySiteNum: number
  blobPalettePool: Microbe[]
  attributesListForKey: string[]
  traitListFull: string[]
  onComplete: (score: import("@/lib/game-scoring").Phase0Score) => void
}) {
  const [i, setI] = useState(0)
  const [rows, setRows] = useState<Phase0DecisionInput[]>([])
  const [choice, setChoice] = useState<"keep" | "return" | null>(null)
  const [reviewMode, setReviewMode] = useState(false)
  const [expandedColumnIds, setExpandedColumnIds] = useState<Set<string>>(() => new Set())
  const [keyExpanded, setKeyExpanded] = useState(false)

  const m = taggedMicrobes[i]
  const req = scenarioToSiteReq(scenario)
  const siteStickyReq = scenario
  const p0SvgMap = useMemo(() => assignUniqueSvgIndices(blobPalettePool), [blobPalettePool])

  const site1Label = `Site ${displaySiteNum}`
  type ColumnMicrobe = { m: Microbe; poolMs: Microbe[] }

  const p0KeepCols: ColumnMicrobe[] = rows
    .filter((d) => d.playerChoice === "keep")
    .map((d) => ({ m: d.microbe as Microbe, poolMs: blobPalettePool }))
  const p0DiscardCols: ColumnMicrobe[] = rows
    .filter((d) => d.playerChoice === "return")
    .map((d) => ({ m: d.microbe as Microbe, poolMs: blobPalettePool }))

  const columnsPhase0: { title: string; badge: string; items: ColumnMicrobe[] }[] = [
    { title: site1Label, badge: "Confirmed", items: p0KeepCols },
    { title: "Return", badge: "Discarded", items: p0DiscardCols },
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
    const union = [...taggedMicrobes, ...blobPalettePool]
    const inPool = new Set(union.map((x) => x.trait))
    const ordered = traitListFull.filter((t) => inPool.has(t))
    const extras = [...inPool].filter((t) => !traitListFull.includes(t)).sort()
    return [...ordered, ...extras]
  }, [blobPalettePool, taggedMicrobes, traitListFull])

  const confirm = () => {
    if (!m || choice === null) return
    const next = [...rows, { microbe: { ...m, name: m.name }, playerChoice: choice, siteRequirements: req }]
    setRows(next)
    setChoice(null)
    if (i >= taggedMicrobes.length - 1) {
      setRows(next)
      setReviewMode(true)
      return
    }
    setI((x) => x + 1)
  }

  const reassignP0Microbe = (microbeId: string, to: "keep" | "return", uid: string) => {
    setRows((prev) => prev.map((d) => ((d.microbe as Microbe).id === microbeId ? { ...d, playerChoice: to } : d)))
    setExpandedColumnIds((prev) => {
      const n = new Set(prev)
      n.delete(uid)
      return n
    })
  }

  if (taggedMicrobes.length === 0) return null

  const displayedMicrobe = m
  const ix = displayedMicrobe ? (p0SvgMap.get(displayedMicrobe.id) ?? 0) : 0
  const Svg = microbeComponents[ix % microbeComponents.length] ?? MicrobeBlob1
  const col = MICROBE_PALETTE[ix % MICROBE_PALETTE.length] ?? "#808080"
  const remainingCount = Math.max(0, taggedMicrobes.length - i)

  const p2SelectedEquivalent = choice === "keep" ? ("keep" as const) : choice === "return" ? ("discard" as const) : null

  return (
    <div className="relative h-[calc(100vh-8rem)] w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-[1] opacity-20">
        <div className="absolute top-20 left-20 h-48 w-32 rounded-lg bg-orange-500/30" />
        <div className="absolute top-32 left-60 h-32 w-20 rounded-lg bg-blue-400/30" />
        <div className="absolute right-40 bottom-40 h-24 w-40 rounded-lg bg-red-400/30" />
        <div className="absolute bottom-20 left-40 h-16 w-24 rounded bg-yellow-500/30" />
      </div>

      <div className="absolute top-20 left-6 z-10 w-64 rounded-xl bg-[rgba(20,20,40,0.92)] p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 font-bold text-white">P</div>
          <h2 className="font-bold text-white">Review Microbes</h2>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm text-gray-400">Task Instructions</span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-white/90">
          <span className="font-semibold">Review Microbes.</span> Review microbes you reserved for this site. With full site
          information now available, confirm or discard each one.
        </p>
        <button type="button" className="flex cursor-pointer items-center gap-2 text-blue-400 hover:text-blue-300">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
            <HelpCircle className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm">Help</span>
        </button>
      </div>

      <div className="absolute top-20 right-6 z-10 w-[15rem] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg bg-[#FFF9C4] p-4 shadow-lg">
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
        <div>
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
              <p className="flex items-center gap-1 font-medium" style={{ color: traitColor(siteStickyReq.undesired_trait) }}>
                {traitIcon(siteStickyReq.undesired_trait, "h-3 w-3 shrink-0")}
                {siteStickyReq.undesired_trait}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-[5] mx-auto mt-[4.5rem] mb-4 flex h-[calc(100%-6rem)] min-h-0 w-[min(900px,calc(100%-18rem))] gap-6 overflow-hidden rounded-2xl border border-white/30 bg-white/95 p-5 shadow-xl backdrop-blur-sm">
        <div className="flex w-[200px] shrink-0 flex-col overflow-y-auto pr-1">
          {reviewMode ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-gray-800">All microbes reviewed.</p>
              <p className="text-sm text-gray-500">You can still reassign microbes before continuing.</p>
              <button
                type="button"
                onClick={() => onComplete(scorePhase0(rows))}
                className="w-full rounded-lg bg-[rgba(20,30,50,0.9)] py-3 text-sm font-semibold text-white hover:bg-[rgba(30,40,60,0.95)]"
              >
                Continue
              </button>
            </div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-baseline gap-2">
                <h2 className="text-lg font-bold text-gray-900">Review Microbes</h2>
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
                  <SlotAttributeRow {...displayedMicrobe} />
                  <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-gray-500">Trait</p>
                  <div className="flex items-center gap-2">
                    <TraitBadgeChip trait={displayedMicrobe.trait} chipClassName="h-8 w-8" />
                    <span className="text-sm font-medium" style={{ color: traitColor(displayedMicrobe.trait) }}>
                      {displayedMicrobe.trait}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nothing to review.</p>
              )}

              <p className="mb-2 mt-5 text-sm font-semibold text-gray-800">Select Category</p>
              <div className="flex shrink-0 flex-col gap-2">
                <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-gray-800">
                  <input
                    type="radio"
                    name="p0cat-game"
                    checked={p2SelectedEquivalent === "keep"}
                    onChange={() => setChoice("keep")}
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span className="min-w-0 break-words">{site1Label}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="p0cat-game"
                    checked={p2SelectedEquivalent === "discard"}
                    onChange={() => setChoice("return")}
                    className="h-4 w-4"
                  />
                  Return
                </label>
              </div>

              <button
                type="button"
                disabled={!displayedMicrobe || choice === null}
                onClick={confirm}
                className={`mt-4 w-full shrink-0 rounded-lg py-3 text-sm font-semibold transition-colors ${
                  displayedMicrobe && choice !== null
                    ? "cursor-pointer bg-[rgba(20,30,50,0.9)] text-white hover:bg-[rgba(30,40,60,0.95)]"
                    : "cursor-not-allowed bg-gray-300 text-gray-500"
                }`}
              >
                Submit Selection
              </button>
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-1 gap-3 overflow-hidden">
          {columnsPhase0.map((colDef) => (
            <div key={colDef.title} className="flex min-w-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white/60 p-3">
              <div className="mb-3 flex flex-col gap-1 border-b border-gray-200 pb-2">
                <h3 className="text-sm font-bold text-gray-900">{colDef.title}</h3>
                <span className="inline-flex max-w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  {colDef.badge}: {colDef.items.length}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
                {colDef.items.map(({ m: mm, poolMs }) => {
                  const uid = `${colDef.title}-${mm.id}-${mm.name}`
                  const open = expandedColumnIds.has(uid)
                  const moveTo = colDef.title === site1Label ? "return" : "keep"
                  const moveLabel = moveTo === "return" ? "Return" : site1Label
                  return (
                    <div key={uid} className="rounded-lg border border-gray-200 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleExpand(uid)}
                        className="flex w-full items-center gap-2 px-2 py-2 text-left hover:bg-gray-50"
                      >
                        <span className="[&>svg]:block [&>svg]:h-8 [&>svg]:w-8">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden">{collapsedBlobCard(mm, poolMs)}</span>
                        </span>
                        <span className="min-w-0 flex-1 text-xs leading-tight font-semibold break-words text-gray-800">{mm.name}</span>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
                      </button>
                      {open ? (
                        <div className="space-y-2 border-t border-gray-100 px-3 py-3 text-sm">
                          <SlotAttributeRow Mobility={mm.Mobility} Agility={mm.Agility} Size={mm.Size} />
                          <div className="flex items-center gap-2 pt-1">
                            <TraitBadgeChip trait={mm.trait} />
                            <span style={{ color: traitColor(mm.trait) }} className="text-xs font-medium">
                              {mm.trait}
                            </span>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => reassignP0Microbe(mm.id, moveTo, uid)}
                              className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                            >
                              Move to {moveLabel}
                            </button>
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

      <div className="absolute right-6 bottom-8 z-20">
        <div
          className={`overflow-hidden rounded-xl bg-[rgba(20,30,50,0.92)] backdrop-blur-sm transition-all ${
            keyExpanded ? "w-48" : "w-20"
          }`}
        >
          <button
            type="button"
            onClick={() => setKeyExpanded(!keyExpanded)}
            className="flex w-full items-center justify-between px-4 py-2 font-medium text-white"
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
        <button type="button" className={DEV_SKIP_BTN_CLASS} onClick={() => onComplete(devPhase0AllKeep(taggedMicrobes, scenario))}>
          Skip →
        </button>
      ) : null}
    </div>
  )
}
