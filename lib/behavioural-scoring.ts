export type PhaseBehaviourData = {
  phase: "phase1" | "phase2" | "phase0" | "phase3" | "phase4"
  siteNumber: 1 | 2 | 3
  clickCount: number
  minClicks: number
  answerSwitches: number
  reassignments?: number
  combinationsTried?: number
  trapMicrobesSelected?: number
}

export type GameBehaviourData = {
  phases: PhaseBehaviourData[]
  totalTimeSeconds: number
}

export type BehaviouralScore = {
  overall: number
  efficiency: number
  behaviour: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function computeBehaviouralScore(
  data: GameBehaviourData,
  totalGameSeconds: number,
): BehaviouralScore {
  if (!data.phases.length) {
    return { overall: 0, efficiency: 0, behaviour: 0 }
  }

  const ratios = data.phases.map((p) => {
    const actualClicks = p.clickCount
    if (actualClicks === 0) return 1
    return Math.min(1, p.minClicks / actualClicks)
  })
  const clickRatio =
    ratios.length > 0
      ? ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length
      : 0

  const timeUsedFraction = totalGameSeconds / 1800
  const timeFactor = clamp(1 - timeUsedFraction * 0.3, 0.5, 1)
  const efficiency = clamp(
    Math.round(Math.pow(clickRatio, 0.6) * timeFactor * 100),
    0,
    100,
  )

  const phase4Rows = data.phases.filter((p) => p.phase === "phase4")
  const phase2And0Rows = data.phases.filter(
    (p) => p.phase === "phase2" || p.phase === "phase0",
  )
  const phase1And3Rows = data.phases.filter(
    (p) => p.phase === "phase1" || p.phase === "phase3",
  )

  const trapPenalty =
    phase4Rows.reduce((sum, p) => sum + (p.trapMicrobesSelected ?? 0), 0) * 15
  const trapScore = Math.max(0, 100 - trapPenalty)

  const totalCombos = phase4Rows.reduce(
    (sum, p) => sum + (p.combinationsTried ?? 0),
    0,
  )
  const comboScore =
    totalCombos <= 3 ? 100 : totalCombos <= 6 ? 85 : totalCombos <= 10 ? 70 : 50

  const totalReassign = phase2And0Rows.reduce(
    (sum, p) => sum + (p.reassignments ?? 0),
    0,
  )
  const reassignScore =
    totalReassign === 0
      ? 100
      : totalReassign <= 2
        ? 90
        : totalReassign <= 5
          ? 75
          : 55

  const totalSwitches = phase1And3Rows.reduce(
    (sum, p) => sum + p.answerSwitches,
    0,
  )
  const switchScore =
    totalSwitches === 0 ? 100 : totalSwitches <= 2 ? 95 : 80

  const behaviour = clamp(
    Math.round(
      trapScore * 0.35 +
        comboScore * 0.3 +
        reassignScore * 0.2 +
        switchScore * 0.15,
    ),
    0,
    100,
  )

  const raw = efficiency * 0.4 + behaviour * 0.6
  const overall = clamp(Math.round(100 * Math.pow(raw / 100, 0.85)), 0, 100)

  return { overall, efficiency, behaviour }
}
