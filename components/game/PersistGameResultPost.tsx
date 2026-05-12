"use client"

import { useUser } from "@clerk/nextjs"
import { useEffect, useRef } from "react"
import type { GameScore } from "@/lib/game-scoring"
import { gameScoreToResultInsert } from "@/lib/persist-game-result"

function scoreFingerprint(g: GameScore) {
  return JSON.stringify([
    "sea_wolf",
    g.globalAverage,
    g.totalTime,
    g.perPhaseAverages.phase1,
    g.perPhaseAverages.phase2,
    g.perPhaseAverages.phase0,
    g.perPhaseAverages.phase3,
    g.perPhaseAverages.phase4,
    g.perSiteAverages.join(","),
    g.sites.map((s) => s.scenarioName).join("|"),
  ])
}

/**
 * POSTs a finished full-session run to `/api/results` once per unique score payload (sessionStorage),
 * only when the user is signed in. Safe under React Strict Mode double-mount.
 */
export function PersistGameResultPost({ gameScore }: { gameScore: GameScore }) {
  const { isSignedIn, isLoaded } = useUser()
  const startedForKey = useRef<string | null>(null)
  const fingerprint = scoreFingerprint(gameScore)

  // fingerprint captures persisted fields; avoids re-running when parent passes a new gameScore reference with the same values.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    const payload = gameScoreToResultInsert(gameScore)
    const dedupeKey = `sw_game_result:${JSON.stringify(payload)}`

    if (typeof window !== "undefined" && window.sessionStorage.getItem(dedupeKey)) return
    if (startedForKey.current === dedupeKey) return
    startedForKey.current = dedupeKey

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(dedupeKey, "1")
    }

    void fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(dedupeKey)
      }
      if (startedForKey.current === dedupeKey) startedForKey.current = null
    })
  }, [isLoaded, isSignedIn, fingerprint])

  return null
}
