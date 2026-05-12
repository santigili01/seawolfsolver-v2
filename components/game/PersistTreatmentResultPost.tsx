"use client"

import { useUser } from "@clerk/nextjs"
import { useEffect, useRef } from "react"
import type { Phase4Score } from "@/lib/game-scoring"
import { treatmentPhase4ToResultInsert } from "@/lib/persist-game-result"

function treatmentFingerprint(phase4: Phase4Score, scenarioDisplayName: string, elapsedSeconds: number) {
  return JSON.stringify([
    "treatment",
    Math.round(Number(phase4.percentage)),
    scenarioDisplayName,
    Math.max(0, Math.round(elapsedSeconds)),
  ])
}

/**
 * POSTs a finished treatment-only (phase 4) run to `/api/results` once per unique payload when signed in.
 */
export function PersistTreatmentResultPost({
  phase4,
  scenarioDisplayName,
  elapsedSeconds,
}: {
  phase4: Phase4Score
  scenarioDisplayName: string
  elapsedSeconds: number
}) {
  const { isSignedIn, isLoaded } = useUser()
  const startedForKey = useRef<string | null>(null)
  const fingerprint = treatmentFingerprint(phase4, scenarioDisplayName, elapsedSeconds)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    const payload = treatmentPhase4ToResultInsert({ phase4, scenarioDisplayName, elapsedSeconds })
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
