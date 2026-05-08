const SIMULATOR_VARIANT = process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR ?? ""
const BUNDLE_VARIANT = process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR_SOLVER ?? ""

export function planNameFromVariant(variantId: string | null | undefined): string {
  if (!variantId) return "No active plan"
  if (variantId === BUNDLE_VARIANT) return "Simulator + Solver"
  if (variantId === SIMULATOR_VARIANT) return "Simulator"
  return "No active plan"
}
