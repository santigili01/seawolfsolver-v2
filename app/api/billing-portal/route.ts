import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabaseAdmin } from "@/utils/supabase/admin"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Billing is not configured" }, { status: 500 })

  const { data: purchase } = await supabaseAdmin
    .from("purchases")
    .select("order_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!purchase?.order_id) {
    return NextResponse.json({ error: "No purchase found" }, { status: 404 })
  }

  const response = await fetch(`https://api.lemonsqueezy.com/v1/orders/${purchase.order_id}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/vnd.api+json",
    },
  })

  let data: unknown
  try {
    data = await response.json()
  } catch {
    return NextResponse.json({ error: "Invalid response from Lemon Squeezy" }, { status: 502 })
  }

  if (!response.ok) {
    return NextResponse.json({ error: "Could not load order from Lemon Squeezy" }, { status: 502 })
  }

  const body = data as { data?: { attributes?: { urls?: { receipt?: string } } } }
  const portalUrl = body.data?.attributes?.urls?.receipt

  if (!portalUrl) {
    return NextResponse.json({ error: "Portal URL not found" }, { status: 500 })
  }

  return NextResponse.redirect(portalUrl)
}
