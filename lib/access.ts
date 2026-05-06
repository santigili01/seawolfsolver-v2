import { supabaseAdmin } from '@/utils/supabase/admin'

const SIMULATOR_VARIANTS = [
  process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR!,
  process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR_SOLVER!,
]

export async function userHasAccess(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .in('variant_id', SIMULATOR_VARIANTS)
    .limit(1)

  return (data?.length ?? 0) > 0
}
