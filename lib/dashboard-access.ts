export type AccessTier = "none" | "simulator" | "simulator_solver"

export function resolveTier(variantIds: string[]): AccessTier {
  const fullVariant = process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR_SOLVER
  const simulatorVariant = process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR

  if (fullVariant && variantIds.includes(fullVariant)) return "simulator_solver"
  if (simulatorVariant && variantIds.includes(simulatorVariant)) return "simulator"
  return "none"
}

/** Sidebar / compact membership label */
export function membershipShortLabel(accessTier: AccessTier): string {
  if (accessTier === "simulator_solver") return "Simulator + Solver"
  if (accessTier === "simulator") return "Simulator"
  return "Free access"
}

/** Settings membership card title */
export function membershipPlanTitle(accessTier: AccessTier): string {
  if (accessTier === "simulator_solver") return "Simulator + Solver"
  if (accessTier === "simulator") return "Simulator"
  return "Free access"
}

export function membershipPlanSubtitle(accessTier: AccessTier, hasSimulatorAccess: boolean): string {
  if (accessTier === "simulator_solver") {
    return "Lifetime access to the full simulator and solver tools."
  }
  if (accessTier === "simulator") {
    return "Lifetime simulator access. Upgrade to add the solver."
  }
  if (hasSimulatorAccess) {
    return "You have simulator-level access."
  }
  return "Limited access. Upgrade to unlock the full simulator and solver."
}
