"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronUp, HelpCircle, Star } from "lucide-react"
import type { SelectionItem as GSelectionItem } from "@/lib/game-scoring"
import { scorePhase1 } from "@/lib/game-scoring"
import {
  DEV_SKIP_BTN_CLASS,
  DEV_MODE,
  devPhase1SkipScoreAndPicks,
  clampSliderStart,
  scenarioToSiteReq,
  selectionKey,
} from "@/lib/game-helpers"
import { ATTR_NAMES, type ScenarioRequirements } from "@/lib/game-types"
import {
  RangeTrack,
  ToggleSwitch,
  TraitBadgeChip,
  attributeKeyIcon,
  attributeRowIcon,
  traitIcon,
} from "@/lib/game-visuals"
import { traitColor } from "@/lib/game-helpers"
import { GameHelpModal } from "@/components/game/GameHelpModal"
import type { PhaseBehaviourData } from "@/lib/behavioural-scoring"

// ─── Phase wrappers ───────────────────────────────────────────────────────────

export function GamePhase1ProfilingPanel({
  scenario,
  stickySiteNumber,
  traits,
  attributesListForKey,
  scenariosFileTraits,
  onBehaviourData,
  onComplete,
}: {
  scenario: ScenarioRequirements
  stickySiteNumber: number
  traits: string[]
  attributesListForKey: string[]
  scenariosFileTraits: string[]
  onBehaviourData: (d: PhaseBehaviourData) => void
  onComplete: (score: import("@/lib/game-scoring").Phase1Score, picks: GSelectionItem[]) => void
}) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [sliderPositions, setSliderPositions] = useState<Record<string, number>>({
    Mobility: 4,
    Agility: 4,
    Size: 4,
  })

  const [keyExpanded, setKeyExpanded] = useState(false)
  const clickCountRef = useRef(0)
  const switchCountRef = useRef(0)
  const hadTwoSelectedRef = useRef(false)

  useEffect(() => {
    setSliderPositions({
      Mobility: 4,
      Agility: 4,
      Size: 4,
    })
  }, [scenario])

  const toggleItem = (item: GSelectionItem) => {
    clickCountRef.current += 1
    const k = selectionKey(item.type, item.name)
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else {
        if (next.size >= 2) return prev
        next.add(k)
      }
      if (hadTwoSelectedRef.current) {
        let changed = prev.size !== next.size
        if (!changed && prev.size === next.size) {
          for (const key of prev) {
            if (!next.has(key)) {
              changed = true
              break
            }
          }
        }
        if (changed) switchCountRef.current += 1
      }
      if (next.size === 2) hadTwoSelectedRef.current = true
      return next
    })
  }

  const handleSlider = useCallback((name: string, val: number) => {
    clickCountRef.current += 1
    setSliderPositions((p) => ({ ...p, [name]: clampSliderStart(val) }))
  }, [])

  const itemsFromKeys = (keys: Set<string>): GSelectionItem[] => {
    const out: GSelectionItem[] = []
    for (const n of ATTR_NAMES) {
      const kk = selectionKey("attribute", n)
      if (keys.has(kk)) {
        const st = clampSliderStart(sliderPositions[n] ?? scenario.attributes[n].min)
        out.push({ type: "attribute", name: n, selectedMin: st, selectedMax: st + 2 })
      }
    }
    for (const t of traits) {
      if (keys.has(selectionKey("trait", t))) out.push({ type: "trait", name: t })
    }
    return out
  }

  const submit = () => {
    if (selectedKeys.size !== 2) return
    const picks = itemsFromKeys(selectedKeys)
    const score = scorePhase1({
      playerSelection: picks,
      scenario: { ...scenarioToSiteReq(scenario), name: scenario.name },
    })
    onBehaviourData({
      phase: "phase1",
      siteNumber: stickySiteNumber as 1 | 2 | 3,
      clickCount: clickCountRef.current,
      minClicks: 4,
      answerSwitches: switchCountRef.current,
    })
    onComplete(score, picks)
  }

  const req = scenario
  const traitList = traits
  const canSubmit = selectedKeys.size === 2
  const keyTraits = scenariosFileTraits.length ? scenariosFileTraits : traitList

  return (
    <div className="relative min-h-[calc(100vh-8rem)] w-full overflow-y-auto pb-10">
      <div className="pointer-events-none absolute inset-0 z-[1] opacity-20">
        <div className="absolute top-20 left-20 h-48 w-32 rounded-lg bg-orange-500/30" />
        <div className="absolute top-32 left-60 h-32 w-20 rounded-lg bg-blue-400/30" />
        <div className="absolute right-40 bottom-40 h-24 w-40 rounded-lg bg-red-400/30" />
        <div className="absolute bottom-20 left-40 h-16 w-24 rounded bg-yellow-500/30" />
      </div>

      <div className="absolute top-20 left-6 z-10 w-64 rounded-xl bg-[rgba(20,20,40,0.92)] p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">P</div>
          <h2 className="font-bold text-white">Profile</h2>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm text-gray-400">Task Instructions</span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-white/90">
          Review the site requirements and select 2 characteristics that best match this location&apos;s needs.
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

      <div className="absolute top-20 right-6 z-10 w-[15rem] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg bg-[#FFF9C4] p-4 shadow-lg">
        <h3 className="mb-2 text-sm font-bold text-gray-800 uppercase">Site {stickySiteNumber} Information</h3>
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

      <div className="relative z-[5] mx-auto mt-3 mb-3 w-[min(900px,calc(100%-18rem))] rounded-2xl border border-white/30 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Characteristics</h2>

        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-600">Attributes</p>
        <div className="mb-5 space-y-2">
          {ATTR_NAMES.map((name) => {
            const r = req.attributes[name]
            const k = selectionKey("attribute", name)
            const on = selectedKeys.has(k)
            const start = clampSliderStart(sliderPositions[name] ?? r.min)
            return (
              <div
                key={name}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-colors ${
                  on ? "border-[#4ECDC4] bg-[#4ECDC4]/10" : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className={`inline-flex shrink-0 ${on ? "" : "opacity-40"}`}>{attributeRowIcon(name)}</span>
                  <span className={`w-[72px] shrink-0 font-medium ${on ? "text-gray-800" : "text-gray-400"}`}>{name}</span>
                  <RangeTrack
                    attrName={name}
                    min={r.min}
                    max={r.max}
                    highlight={on}
                    sliderStart={start}
                    onSliderChange={handleSlider}
                  />
                  <span
                    className={`w-14 shrink-0 text-center text-sm font-semibold tabular-nums ${
                      on ? "text-gray-700" : "text-gray-400"
                    }`}
                  >
                    {start}-{start + 2}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleItem({ type: "attribute", name })}
                  className="shrink-0 cursor-pointer appearance-none border-none bg-transparent p-0"
                  aria-label={`Toggle ${name}`}
                >
                  <ToggleSwitch on={on} />
                </button>
              </div>
            )
          })}
        </div>

        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-600">Traits</p>
        <div className="mb-5 space-y-2">
          {traitList.map((trait) => {
            const k = selectionKey("trait", trait)
            const on = selectedKeys.has(k)
            const tc = traitColor(trait)
            return (
              <div
                key={trait}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
                  on ? "border-[#4ECDC4] bg-[#4ECDC4]/10" : "border-gray-200 bg-white"
                }`}
              >
                <TraitBadgeChip trait={trait} chipClassName="h-8 w-8" />
                <span className="min-w-0 flex-1 font-medium break-words" style={{ color: tc }}>
                  {trait}
                </span>
                <button
                  type="button"
                  onClick={() => toggleItem({ type: "trait", name: trait })}
                  className="shrink-0 cursor-pointer appearance-none border-none bg-transparent p-0"
                  aria-label={`Toggle ${trait}`}
                >
                  <ToggleSwitch on={on} />
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex justify-center border-t border-gray-200 pt-4">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              if (selectedKeys.size === 2) {
                clickCountRef.current += 1
                setShowConfirm(true)
              }
            }}
            className={`min-w-[200px] rounded-lg px-10 py-2.5 text-sm font-semibold transition-colors ${
              canSubmit
                ? "cursor-pointer bg-[rgba(20,30,50,0.9)] text-white hover:bg-[rgba(30,40,60,0.95)]"
                : "cursor-not-allowed bg-gray-300 text-gray-500"
            }`}
          >
            Confirm Selection
          </button>
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
        <button
          type="button"
          className={DEV_SKIP_BTN_CLASS}
          onClick={() => {
            clickCountRef.current += 1
            const { score, picks } = devPhase1SkipScoreAndPicks(scenario)
            onBehaviourData({
              phase: "phase1",
              siteNumber: stickySiteNumber as 1 | 2 | 3,
              clickCount: clickCountRef.current,
              minClicks: 4,
              answerSwitches: switchCountRef.current,
            })
            onComplete(score, picks)
          }}
        >
          Skip →
        </button>
      ) : null}
      {showConfirm ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-gray-900">Confirm your selection</h3>
            <p className="mb-1 text-sm text-gray-600">You have selected:</p>
            <ul className="mb-4 space-y-1 text-sm font-semibold text-gray-800">
              {itemsFromKeys(selectedKeys).map((item) => (
                <li key={`${item.type}-${item.name}`} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4ECDC4]" />
                  {item.type === "attribute" ? `${item.name} (${item.selectedMin}–${item.selectedMax})` : item.name}
                </li>
              ))}
            </ul>
            <p className="mb-5 text-sm text-gray-500">You won&apos;t be able to change these after confirming.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => {
                  clickCountRef.current += 1
                  setShowConfirm(false)
                  submit()
                }}
                className="flex-1 rounded-lg bg-[rgba(20,30,50,0.9)] py-2.5 text-sm font-semibold text-white hover:bg-[rgba(30,40,60,0.95)]"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <GameHelpModal open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}
