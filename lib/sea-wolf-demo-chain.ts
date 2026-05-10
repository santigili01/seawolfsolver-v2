import type {
  CatPoolsFile,
  GameConfig,
  ProspectPoolsFile,
  ScenarioRequirements,
} from "@/lib/game-types"
import { poolKey } from "@/lib/game-helpers"

/** Public free demo: one fixed site, 10-minute session (full game is 30 min). */
export const SEA_WOLF_DEMO_TIMER_START = 10 * 60

const DEMO_A = "Coral Reef Delta"
const DEMO_B = "Arctic Shelf"
const DEMO_C = "Volcanic Vent"

const byName = (scenarios: ScenarioRequirements[], n: string) => scenarios.find((s) => s.name === n)

const traitsDiffer = (x: ScenarioRequirements, y: ScenarioRequirements) =>
  x.desired_trait !== y.desired_trait

/**
 * Deterministic `GameConfig` for `/sea-wolf-demo`: same scenario chain and
 * first pool in every slot on every play. Mirrors validation in `pickScenarioChain`
 * without randomness.
 */
export function pickDemoScenarioChain(
  scenarios: ScenarioRequirements[],
  catPools: CatPoolsFile,
  prospectPools: ProspectPoolsFile,
): GameConfig | null {
  const A = byName(scenarios, DEMO_A)
  const B = byName(scenarios, DEMO_B)
  const C = byName(scenarios, DEMO_C)
  if (!A || !B || !C) return null
  if (!traitsDiffer(A, B) || !traitsDiffer(B, C)) return null

  const k12 = poolKey(A.name, B.name)
  const k23 = poolKey(B.name, C.name)
  const list12 = catPools[k12]
  const list23 = catPools[k23]
  if (!list12?.length || !list23?.length) return null

  const keysFromC = Object.keys(catPools).filter(
    (k) => k.startsWith(`${C.name}__`) && (catPools[k]?.length ?? 0) > 0,
  )
  if (!keysFromC.length) return null
  const cat3Key = keysFromC.sort()[0]!
  const list3 = catPools[cat3Key]
  if (!list3?.length) return null

  const pa = prospectPools[A.name]
  const pb = prospectPools[B.name]
  const pc = prospectPools[C.name]
  if (!pa?.length || !pb?.length || !pc?.length) return null

  return {
    scenarios: [A, B, C],
    catPool12: list12[0]!,
    catPool23: list23[0]!,
    catPoolSite3: list3[0]!,
    prospectA: pa[0]!,
    prospectB: pb[0]!,
    prospectC: pc[0]!,
  }
}
