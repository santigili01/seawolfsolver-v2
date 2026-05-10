"use client"

import type { SelectionItem as GSelectionItem } from "@/lib/game-scoring"
import { computeGameScore, type GameScore, type Phase1Score, type Phase4Score } from "@/lib/game-scoring"
import {
  newSiteWip,
  phaseLabelFromStep,
  sealPartialToSiteScore,
  siteHighlightFromStep,
} from "@/lib/game-helpers"
import { pickDemoScenarioChain, SEA_WOLF_DEMO_TIMER_START } from "@/lib/sea-wolf-demo-chain"
import { ATTR_NAMES, type CatPoolsFile, type GameStep, type Microbe, type PartialSiteAccumulator, type ProspectPoolsFile, type ScenariosFile } from "@/lib/game-types"
import type { SiteScore } from "@/lib/game-scoring"
import { SharedTopBar } from "@/lib/game-visuals"
import { GamePhase1ProfilingPanel } from "@/components/game/GamePhase1ProfilingPanel"
import { GamePhase2Panel } from "@/components/game/GamePhase2Panel"
import { GamePhase3PoolPanel } from "@/components/game/GamePhase3PoolPanel"
import { GamePhase4TreatmentPanel } from "@/components/game/GamePhase4TreatmentPanel"
import { GameResultsFull } from "@/components/game/GameResultsFull"
import { computeBehaviouralScore, type PhaseBehaviourData } from "@/lib/behavioural-scoring"

import { useCallback, useEffect, useRef, useState } from "react"

/** Public free demo: one fixed site, four phases, deterministic pools. */

export default function SeaWolfDemoPage() {
  const [step, setStep] = useState<GameStep>("start")
  const [timeRemaining, setTimeRemaining] = useState(SEA_WOLF_DEMO_TIMER_START)
  const [scenariosMeta, setScenariosMeta] = useState<ScenariosFile | null>(null)
  const [gameCfg, setGameCfg] = useState<import("@/lib/game-types").GameConfig | null>(null)
  const [pickingChains, setPickingChains] = useState(false)

  const [wip, setWip] = useState<PartialSiteAccumulator | null>(null)
  const wipRef = useRef<PartialSiteAccumulator | null>(null)
  wipRef.current = wip

  const [finishedSites, setFinishedSites] = useState<SiteScore[]>([])
  const [treatmentPoolsBySite, setTreatmentPoolsBySite] = useState<Microbe[][]>([])
  const [p1SelectionsBySite, setP1SelectionsBySite] = useState<GSelectionItem[][]>([])
  const [behaviourDataLog, setBehaviourDataLog] = useState<PhaseBehaviourData[]>([])

  const remainRef = useRef(timeRemaining)
  useEffect(() => {
    remainRef.current = timeRemaining
  }, [timeRemaining])

  const siteRemainAtEnterRef = useRef<(number | null)[]>([null, null, null])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch("/scenarios.json")
        const j = (await r.json()) as ScenariosFile
        if (!cancelled) setScenariosMeta(j)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (step === "start" || step === "results") return
    const id = window.setInterval(() => {
      setTimeRemaining((t) => (t <= 0 ? 0 : t - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [step])

  const traitsList = scenariosMeta?.traits ?? []
  const attrListForKey = scenariosMeta?.attributes ?? ATTR_NAMES.slice()

  const handleStartGame = useCallback(async () => {
    setPickingChains(true)
    try {
      const scRes =
        scenariosMeta ??
        (((await fetch("/scenarios.json").then((r) => r.json())) as ScenariosFile) ?? null)
      if (!scRes?.scenarios?.length) {
        window.alert("Could not load scenarios.")
        setPickingChains(false)
        return
      }
      if (!scenariosMeta) setScenariosMeta(scRes)

      const [cats, prospects] = await Promise.all([
        fetch("/categorization_pools.json").then((r) => r.json()) as Promise<CatPoolsFile>,
        fetch("/phase2_pools.json").then((r) => r.json()) as Promise<ProspectPoolsFile>,
      ])

      const chain = pickDemoScenarioChain(scRes.scenarios, cats, prospects)
      if (!chain) {
        window.alert("Could not load the demo scenario — please try again later.")
        setPickingChains(false)
        return
      }

      setTimeRemaining(SEA_WOLF_DEMO_TIMER_START)
      remainRef.current = SEA_WOLF_DEMO_TIMER_START
      siteRemainAtEnterRef.current = [SEA_WOLF_DEMO_TIMER_START, null, null]

      setFinishedSites([])
      setTreatmentPoolsBySite([])
      setP1SelectionsBySite([])
      setBehaviourDataLog([])
      setGameCfg(chain)
      setWip(newSiteWip(1, chain))
      setStep("s1_phase1")
    } catch (e) {
      console.error(e)
      window.alert("Failed to load game data.")
    } finally {
      setPickingChains(false)
    }
  }, [scenariosMeta])

  const logPhaseBehaviour = useCallback((d: PhaseBehaviourData) => {
    setBehaviourDataLog((prev) => [...prev, d])
  }, [])

  const cfg = gameCfg
  const w = wip
  const gameCfgRef = useRef<import("@/lib/game-types").GameConfig | null>(null)
  gameCfgRef.current = cfg

  const resolvePhase4Complete = useCallback((p4: Phase4Score) => {
    const wc = wipRef.current
    const g = gameCfgRef.current
    if (!wc || !g) return

    const merged: PartialSiteAccumulator = { ...wc, phase4Result: p4 }
    const startRem = siteRemainAtEnterRef.current[0] ?? remainRef.current
    const elapsed = Math.max(0, startRem - remainRef.current)

    const sealed = sealPartialToSiteScore(merged, elapsed)
    const treatmentPoolSnap = [...wc.phase3Pool]

    setFinishedSites((prev) => [...prev, sealed])
    setTreatmentPoolsBySite((prev) => [...prev, treatmentPoolSnap])
    setP1SelectionsBySite((prev) => [...prev, wc.phase1Selections])
    setWip(null)
    setStep("results")
  }, [])

  const progressPct = Math.min(100, Math.max(0, (timeRemaining / SEA_WOLF_DEMO_TIMER_START) * 100))

  if (step === "results" && finishedSites.length === 1 && cfg) {
    const totalElapsed = SEA_WOLF_DEMO_TIMER_START - timeRemaining
    const gameScore: GameScore = computeGameScore(finishedSites, totalElapsed)
    const behaviouralScore = computeBehaviouralScore(
      { phases: behaviourDataLog, totalTimeSeconds: totalElapsed },
      totalElapsed,
    )
    return (
      <GameResultsFull
        gameScore={gameScore}
        behaviouralScore={behaviouralScore}
        totalSeconds={totalElapsed}
        demoConversionUpsell
        siteDetail={finishedSites.map((siteRow, ix) => ({
          site: siteRow,
          phase1Picks: p1SelectionsBySite[ix],
          scenarios: cfg.scenarios[siteRow.siteNumber - 1]!,
          treatmentPool: treatmentPoolsBySite[ix] ?? [],
          catPoolMicrobes: ix === 0 ? cfg.catPool12.microbes : ix === 1 ? cfg.catPool23.microbes : cfg.catPoolSite3.microbes,
          prospectChooseSets: ix === 0 ? cfg.prospectA.choose_sets : ix === 1 ? cfg.prospectB.choose_sets : cfg.prospectC.choose_sets,
          revealedChar: ix === 0 ? cfg.catPool12.revealed_characteristic : ix === 1 ? cfg.catPool23.revealed_characteristic : null,
        }))}
      />
    )
  }

  const phaseLbl = phaseLabelFromStep(step)
  const highlightSite = step === "start" ? 1 : siteHighlightFromStep(step)

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#4ECDC4] via-[#3EBDB5] to-[#2BA8A0]">
      {step !== "start" ? (
        <>
          <SharedTopBar
            timeRemaining={timeRemaining}
            currentSiteHighlight={highlightSite}
            phaseLabel={phaseLbl}
            progressPercent={progressPct}
          />
        </>
      ) : null}

      {step === "start" ? (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center text-white">
          <p className="mb-2 text-xs font-semibold tracking-widest text-white/90 uppercase">Free demo</p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Sea Wolf Demo</h1>
          <p className="mb-10 max-w-md text-lg text-white/95">
            One site, four phases, fixed scenario—try the simulator with no account. Same mechanics as the full practice run.
          </p>
          <button
            type="button"
            disabled={pickingChains}
            onClick={() => void handleStartGame()}
            className={`rounded-xl px-14 py-4 text-lg font-semibold shadow-lg transition ${
              pickingChains ? "cursor-wait bg-gray-600 text-gray-300" : "cursor-pointer bg-[rgba(20,30,50,0.95)] text-white hover:bg-[rgba(30,45,65,1)]"
            }`}
          >
            {pickingChains ? "Loading…" : "Start Demo"}
          </button>
        </div>
      ) : null}

      {cfg && w ? (
        <>
          {step === "s1_phase1" ? (
            <GamePhase1ProfilingPanel
              key="demo-s1-p1"
              stickySiteNumber={w.siteNumber}
              traits={traitsList}
              scenario={cfg.scenarios[0]!}
              attributesListForKey={attrListForKey}
              scenariosFileTraits={traitsList}
              onBehaviourData={logPhaseBehaviour}
              onComplete={(score: Phase1Score, picks: GSelectionItem[]) => {
                setWip((cur) => (cur ? { ...cur, phase1Result: score, phase1Selections: picks } : cur))
                setStep("s1_phase2")
              }}
            />
          ) : null}

          {step === "s1_phase2" ? (
            <GamePhase2Panel
              key={`demo-s12-${cfg.catPool12.categorization_id}`}
              pool={cfg.catPool12}
              scenario={cfg.scenarios[w.siteNumber - 1]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
              traitListFull={traitsList}
              isLastSite={false}
              onBehaviourData={logPhaseBehaviour}
              onComplete={(score, _tagged, _rows) => {
                void _tagged
                void _rows
                setWip((cur) => (cur ? { ...cur, phase2Result: score } : cur))
                setStep("s1_phase3")
              }}
            />
          ) : null}

          {step === "s1_phase3" ? (
            <GamePhase3PoolPanel
              key={`demo-s1-p3-${cfg.prospectA.phase2_id}`}
              prospect={cfg.prospectA}
              scenario={cfg.scenarios[0]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
              scenariosFileTraits={traitsList}
              onBehaviourData={logPhaseBehaviour}
              onComplete={(score, pool, svgMap) => {
                setWip((cur) =>
                  cur ? { ...cur, phase3Result: score, phase3Pool: pool, phase3SvgMap: svgMap } : cur,
                )
                setStep("s1_phase4")
              }}
            />
          ) : null}

          {step === "s1_phase4" && w.phase3Pool.length && w.phase3SvgMap ? (
            <GamePhase4TreatmentPanel
              key="demo-s1-p4"
              builtPool={w.phase3Pool}
              svgMap={w.phase3SvgMap}
              scenario={cfg.scenarios[0]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
              scenariosFileTraits={traitsList}
              onBehaviourData={logPhaseBehaviour}
              onComplete={resolvePhase4Complete}
            />
          ) : null}
        </>
      ) : step !== "start" ? (
        <div className="flex min-h-screen items-center justify-center text-white">
          <p>Something went wrong — go back and start again.</p>
        </div>
      ) : null}
    </div>
  )
}
