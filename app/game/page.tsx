"use client"

import type { SelectionItem as GSelectionItem } from "@/lib/game-scoring"
import { computeGameScore, type GameScore, type Phase1Score, type Phase4Score } from "@/lib/game-scoring"
import { DEV_MODE, buildDevFinishedThreeSites, newSiteWip, phaseLabelFromStep, pickScenarioChain, sealPartialToSiteScore, siteHighlightFromStep } from "@/lib/game-helpers"
import { ATTR_NAMES, TIMER_START, type CatPoolsFile, type GameConfig, type GameStep, type Microbe, type PartialSiteAccumulator, type ProspectPoolsFile, type ScenariosFile } from "@/lib/game-types"
import type { SiteScore } from "@/lib/game-scoring"
import { SharedTopBar } from "@/lib/game-visuals"
import { GamePhase0Panel } from "@/components/game/GamePhase0Panel"
import { GamePhase1ProfilingPanel } from "@/components/game/GamePhase1ProfilingPanel"
import { GamePhase2Panel } from "@/components/game/GamePhase2Panel"
import { GamePhase3PoolPanel } from "@/components/game/GamePhase3PoolPanel"
import { GamePhase4TreatmentPanel } from "@/components/game/GamePhase4TreatmentPanel"
import { GameResultsFull } from "@/components/game/GameResultsFull"
import { computeBehaviouralScore, type PhaseBehaviourData } from "@/lib/behavioural-scoring"

/**
 * Full-session Seawolf simulator: /game
 * Standalone simulator routes are untouched; phases are inlined wrappers here.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

export default function FullGamePage() {
  const [step, setStep] = useState<GameStep>("start")
  const [timeRemaining, setTimeRemaining] = useState(TIMER_START)
  const [scenariosMeta, setScenariosMeta] = useState<ScenariosFile | null>(null)
  const [gameCfg, setGameCfg] = useState<GameConfig | null>(null)
  const [pickingChains, setPickingChains] = useState(false)

  const [wip, setWip] = useState<PartialSiteAccumulator | null>(null)
  const wipRef = useRef<PartialSiteAccumulator | null>(null)
  wipRef.current = wip

  const [finishedSites, setFinishedSites] = useState<SiteScore[]>([])
  const [treatmentPoolsBySite, setTreatmentPoolsBySite] = useState<Microbe[][]>([])
  const [p1SelectionsBySite, setP1SelectionsBySite] = useState<GSelectionItem[][]>([])
  const [taggedForSite2, setTaggedForSite2] = useState<Microbe[]>([])
  const [taggedForSite3, setTaggedForSite3] = useState<Microbe[]>([])
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
        /* ignore prefetch failure; start-game will retry */
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

      const chain = pickScenarioChain(scRes.scenarios, cats, prospects)
      if (!chain) {
        window.alert("Could not build a scenario chain — try Start again.")
        setPickingChains(false)
        return
      }

      setTimeRemaining(TIMER_START)
      remainRef.current = TIMER_START
      siteRemainAtEnterRef.current = [TIMER_START, null, null]

      setTaggedForSite2([])
      setTaggedForSite3([])
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

  const handleSkipToResults = useCallback(async () => {
    if (pickingChains) return
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

      const chain = pickScenarioChain(scRes.scenarios, cats, prospects)
      if (!chain) {
        window.alert("Could not build a scenario chain — try again.")
        setPickingChains(false)
        return
      }

      const { finished, pools, p1Picks } = buildDevFinishedThreeSites(chain)
      setTaggedForSite2([])
      setTaggedForSite3([])
      setBehaviourDataLog([])
      setGameCfg(chain)
      setFinishedSites(finished)
      setTreatmentPoolsBySite(pools)
      setP1SelectionsBySite(p1Picks)
      setWip(null)
      setStep("results")
    } catch (e) {
      console.error(e)
      window.alert("Failed to load game data.")
    } finally {
      setPickingChains(false)
    }
  }, [pickingChains, scenariosMeta])

  const cfg = gameCfg
  const w = wip
  const gameCfgRef = useRef<GameConfig | null>(null)
  gameCfgRef.current = cfg

  const resolvePhase4Complete = useCallback(
    (p4: Phase4Score) => {
      const wc = wipRef.current
      const g = gameCfgRef.current
      if (!wc || !g) return

      const merged: PartialSiteAccumulator = { ...wc, phase4Result: p4 }
      const siteIdx = wc.siteNumber - 1
      const startRem = siteRemainAtEnterRef.current[siteIdx] ?? remainRef.current
      const elapsed = Math.max(0, startRem - remainRef.current)

      const sealed = sealPartialToSiteScore(merged, elapsed)
      const treatmentPoolSnap = [...wc.phase3Pool]

      if (wc.siteNumber === 1) {
        siteRemainAtEnterRef.current[1] = remainRef.current
        setFinishedSites((prev) => [...prev, sealed])
        setTreatmentPoolsBySite((prev) => [...prev, treatmentPoolSnap])
        setP1SelectionsBySite((prev) => [...prev, wc.phase1Selections])
        setWip(newSiteWip(2, g))
        setStep(taggedForSite2.length > 0 ? "s2_phase0" : "s2_phase1")
        return
      }

      if (wc.siteNumber === 2) {
        siteRemainAtEnterRef.current[2] = remainRef.current
        setFinishedSites((prev) => [...prev, sealed])
        setTreatmentPoolsBySite((prev) => [...prev, treatmentPoolSnap])
        setP1SelectionsBySite((prev) => [...prev, wc.phase1Selections])
        setWip(newSiteWip(3, g))
        setStep(taggedForSite3.length > 0 ? "s3_phase0" : "s3_phase1")
        return
      }

      setFinishedSites((prev) => [...prev, sealed])
      setTreatmentPoolsBySite((prev) => [...prev, treatmentPoolSnap])
      setP1SelectionsBySite((prev) => [...prev, wc.phase1Selections])
      setStep("results")
    },
    [taggedForSite2.length, taggedForSite3.length],
  )

  const progressPct = Math.min(100, Math.max(0, (timeRemaining / TIMER_START) * 100))

  if (step === "results" && finishedSites.length === 3 && cfg) {
    const totalElapsed = TIMER_START - timeRemaining
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
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Seawolf Simulator</h1>
          <p className="mb-10 max-w-md text-lg text-white/95">
            Practice all 4 phases across 3 sites in a full 30-minute session
          </p>
          <button
            type="button"
            disabled={pickingChains}
            onClick={() => void handleStartGame()}
            className={`rounded-xl px-14 py-4 text-lg font-semibold shadow-lg transition ${
              pickingChains ? "cursor-wait bg-gray-600 text-gray-300" : "cursor-pointer bg-[rgba(20,30,50,0.95)] text-white hover:bg-[rgba(30,45,65,1)]"
            }`}
          >
            {pickingChains ? "Loading…" : "Start Game"}
          </button>
          {DEV_MODE ? (
            <button
              type="button"
              disabled={pickingChains}
              onClick={() => void handleSkipToResults()}
              className="mt-6 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-orange-600 disabled:cursor-wait disabled:opacity-70"
            >
              → Skip to Results
            </button>
          ) : null}
        </div>
      ) : null}

      {cfg && w ? (
        <>
          {step === "s1_phase1" ? (
            <GamePhase1ProfilingPanel
              key="s1-p1"
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
              key={`s12-${cfg.catPool12.categorization_id}`}
              pool={cfg.catPool12}
              scenario={cfg.scenarios[w.siteNumber - 1]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
              traitListFull={traitsList}
              isLastSite={false}
              onBehaviourData={logPhaseBehaviour}
              onComplete={(score, tagged, _rows) => {
                void _rows
                setTaggedForSite2(tagged)
                setWip((cur) => (cur ? { ...cur, phase2Result: score } : cur))
                setStep("s1_phase3")
              }}
            />
          ) : null}

          {step === "s1_phase3" ? (
            <GamePhase3PoolPanel
              key={`s1-p3-${cfg.prospectA.phase2_id}`}
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
              key="s1-p4"
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

          {step === "s2_phase0" && taggedForSite2.length > 0 ? (
            <GamePhase0Panel
              key="s2-p0"
              taggedMicrobes={taggedForSite2}
              scenario={cfg.scenarios[1]!}
              displaySiteNum={w.siteNumber}
              blobPalettePool={cfg.catPool12.microbes}
              attributesListForKey={attrListForKey}
              traitListFull={traitsList}
              onBehaviourData={logPhaseBehaviour}
              onComplete={(p0) => {
                setWip((cur) => (cur ? { ...cur, phase0Result: p0 } : cur))
                setStep("s2_phase1")
              }}
            />
          ) : null}

          {step === "s2_phase1" ? (
            <GamePhase1ProfilingPanel
              key="s2-p1"
              stickySiteNumber={w.siteNumber}
              traits={traitsList}
              scenario={cfg.scenarios[1]!}
              attributesListForKey={attrListForKey}
              scenariosFileTraits={traitsList}
              onBehaviourData={logPhaseBehaviour}
              onComplete={(score: Phase1Score, picks: GSelectionItem[]) => {
                setWip((cur) => (cur ? { ...cur, phase1Result: score, phase1Selections: picks } : cur))
                setStep("s2_phase2")
              }}
            />
          ) : null}

          {step === "s2_phase2" ? (
            <GamePhase2Panel
              key={`s23-${cfg.catPool23.categorization_id}`}
              pool={cfg.catPool23}
              scenario={cfg.scenarios[w.siteNumber - 1]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
              traitListFull={traitsList}
              isLastSite={false}
              onBehaviourData={logPhaseBehaviour}
              onComplete={(score, tagged, _rows) => {
                void _rows
                setTaggedForSite3(tagged)
                setWip((cur) => (cur ? { ...cur, phase2Result: score } : cur))
                setStep("s2_phase3")
              }}
            />
          ) : null}

          {step === "s2_phase3" ? (
            <GamePhase3PoolPanel
              key={`s2-p3-${cfg.prospectB.phase2_id}`}
              prospect={cfg.prospectB}
              scenario={cfg.scenarios[1]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
              scenariosFileTraits={traitsList}
              onBehaviourData={logPhaseBehaviour}
              onComplete={(score, pool, svgMap) => {
                setWip((cur) =>
                  cur ? { ...cur, phase3Result: score, phase3Pool: pool, phase3SvgMap: svgMap } : cur,
                )
                setStep("s2_phase4")
              }}
            />
          ) : null}

          {step === "s2_phase4" && w.phase3Pool.length && w.phase3SvgMap ? (
            <GamePhase4TreatmentPanel
              key="s2-p4"
              builtPool={w.phase3Pool}
              svgMap={w.phase3SvgMap}
              scenario={cfg.scenarios[1]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
              scenariosFileTraits={traitsList}
              onBehaviourData={logPhaseBehaviour}
              onComplete={resolvePhase4Complete}
            />
          ) : null}

          {step === "s3_phase0" && taggedForSite3.length > 0 ? (
            <GamePhase0Panel
              key="s3-p0"
              taggedMicrobes={taggedForSite3}
              scenario={cfg.scenarios[2]!}
              displaySiteNum={w.siteNumber}
              blobPalettePool={cfg.catPool23.microbes}
              attributesListForKey={attrListForKey}
              traitListFull={traitsList}
              onBehaviourData={logPhaseBehaviour}
              onComplete={(p0) => {
                setWip((cur) => (cur ? { ...cur, phase0Result: p0 } : cur))
                setStep("s3_phase1")
              }}
            />
          ) : null}

          {step === "s3_phase1" ? (
            <GamePhase1ProfilingPanel
              key="s3-p1"
              stickySiteNumber={w.siteNumber}
              traits={traitsList}
              scenario={cfg.scenarios[2]!}
              attributesListForKey={attrListForKey}
              scenariosFileTraits={traitsList}
              onBehaviourData={logPhaseBehaviour}
              onComplete={(score: Phase1Score, picks: GSelectionItem[]) => {
                setWip((cur) => (cur ? { ...cur, phase1Result: score, phase1Selections: picks } : cur))
                setStep("s3_phase2")
              }}
            />
          ) : null}

          {step === "s3_phase2" ? (
            <GamePhase2Panel
              key={`s3-${cfg.catPoolSite3.categorization_id}`}
              pool={cfg.catPoolSite3}
              scenario={cfg.scenarios[w.siteNumber - 1]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
              traitListFull={traitsList}
              isLastSite
              onBehaviourData={logPhaseBehaviour}
              onComplete={(score, _tagged, _rows) => {
                void _tagged
                void _rows
                setWip((cur) => (cur ? { ...cur, phase2Result: score } : cur))
                setStep("s3_phase3")
              }}
            />
          ) : null}

          {step === "s3_phase3" ? (
            <GamePhase3PoolPanel
              key={`s3-p3-${cfg.prospectC.phase2_id}`}
              prospect={cfg.prospectC}
              scenario={cfg.scenarios[2]!}
              displaySiteNum={w.siteNumber}
              attributesListForKey={attrListForKey}
              scenariosFileTraits={traitsList}
              onBehaviourData={logPhaseBehaviour}
              onComplete={(score, pool, svgMap) => {
                setWip((cur) =>
                  cur ? { ...cur, phase3Result: score, phase3Pool: pool, phase3SvgMap: svgMap } : cur,
                )
                setStep("s3_phase4")
              }}
            />
          ) : null}

          {step === "s3_phase4" && w.phase3Pool.length && w.phase3SvgMap ? (
            <GamePhase4TreatmentPanel
              key="s3-p4"
              builtPool={w.phase3Pool}
              svgMap={w.phase3SvgMap}
              scenario={cfg.scenarios[2]!}
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
