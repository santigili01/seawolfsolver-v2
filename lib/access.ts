import { supabaseAdmin } from '@/utils/supabase/admin'

const SIMULATOR_VARIANTS = [
  process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR!,
  process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR_SOLVER!,
]

/** /game — either Simulator-only or Simulator + Solver purchase */
export async function userHasAccess(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .in('variant_id', SIMULATOR_VARIANTS)
    .limit(1)

  return (data?.length ?? 0) > 0
}

/**
 * /solver — Simulator + Solver bundle, and optionally a standalone Solver SKU
 * (`NEXT_PUBLIC_LMS_VARIANT_SOLVER` when you sell solver without simulator).
 * Simulator-only tier does not include solver per pricing copy.
 */
export async function userHasSolverAccess(userId: string): Promise<boolean> {
  const bundle = process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR_SOLVER
  const solverStandalone = process.env.NEXT_PUBLIC_LMS_VARIANT_SOLVER

  const allowed = [bundle, solverStandalone].filter(Boolean) as string[]
  if (allowed.length === 0) return false

  const { data } = await supabaseAdmin
    .from('purchases')
    .select('variant_id')
    .eq('user_id', userId)
    .in('variant_id', allowed)
    .limit(1)

  return (data?.length ?? 0) > 0
}
