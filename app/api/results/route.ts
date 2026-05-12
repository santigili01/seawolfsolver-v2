import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { z } from "zod"
import { supabaseAdmin } from "@/utils/supabase/admin"
import { GAME_RESULT_GAME_TYPES, type GameResultRow } from "@/lib/game-result-types"

const insertBodySchema = z.object({
  game_type: z.enum(GAME_RESULT_GAME_TYPES),
  global_score: z.number().finite(),
  time_taken: z.number().int().nonnegative(),
  phase1_avg: z.number().finite().nullable(),
  phase2_avg: z.number().finite().nullable(),
  phase0_avg: z.number().finite().nullable(),
  phase3_avg: z.number().finite().nullable(),
  phase4_avg: z.number().finite().nullable(),
  site1_score: z.number().finite().nullable(),
  site2_score: z.number().finite().nullable(),
  site3_score: z.number().finite().nullable(),
  site1_scenario: z.string().nullable(),
  site2_scenario: z.string().nullable(),
  site3_scenario: z.string().nullable(),
})

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from("game_results")
    .select("*")
    .eq("user_id", userId)
    .order("played_at", { ascending: false })
    .limit(200)

  if (error) {
    console.error("[api/results GET]", error)
    return NextResponse.json({ error: "Could not load results" }, { status: 500 })
  }

  return NextResponse.json({ results: (data ?? []) as GameResultRow[] })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = insertBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 })
  }

  const user = await currentUser()
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    `${userId}@placeholder.local`

  const { error: userErr } = await supabaseAdmin.from("users").upsert({ id: userId, email }, { onConflict: "id" })
  if (userErr) {
    console.error("[api/results POST] users upsert", userErr)
    return NextResponse.json({ error: "Could not ensure user record" }, { status: 500 })
  }

  const row = { user_id: userId, ...parsed.data }
  const { data, error } = await supabaseAdmin.from("game_results").insert(row).select("id").single()

  if (error) {
    console.error("[api/results POST] insert", error)
    return NextResponse.json({ error: "Could not save result" }, { status: 500 })
  }

  return NextResponse.json({ id: data?.id as string }, { status: 201 })
}
