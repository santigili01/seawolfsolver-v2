"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/utils/supabase/admin"

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function updateDisplayName(displayName: string): Promise<ActionResult> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Not signed in" }

  const trimmed = displayName.trim()
  if (trimmed.length < 1) return { ok: false, error: "Display name is required" }
  if (trimmed.length > 80) return { ok: false, error: "Display name is too long" }

  const parts = trimmed.split(/\s+/)
  const firstName = parts[0] ?? ""
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : ""

  try {
    const client = await clerkClient()
    await client.users.updateUser(userId, { firstName, lastName })
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/settings")
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed"
    return { ok: false, error: msg }
  }
}

export async function deleteAccount(password: string): Promise<ActionResult> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Not signed in" }

  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    if (!user.passwordEnabled) {
      return {
        ok: false,
        error:
          "This account uses social sign-in. Delete or manage it from your provider or via the profile menu in Clerk.",
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not verify account type"
    return { ok: false, error: msg }
  }

  const trimmed = password.trim()
  if (!trimmed) return { ok: false, error: "Password is required" }

  try {
    const client = await clerkClient()
    await client.users.verifyPassword({ userId, password: trimmed })
  } catch {
    return { ok: false, error: "Incorrect password" }
  }

  try {
    const client = await clerkClient()
    const { error: purchasesErr } = await supabaseAdmin.from("purchases").delete().eq("user_id", userId)
    if (purchasesErr) {
      console.error("deleteAccount purchases cleanup:", purchasesErr.message)
    }
    const { error: usersErr } = await supabaseAdmin.from("users").delete().eq("id", userId)
    if (usersErr) {
      console.error("deleteAccount users cleanup:", usersErr.message)
    }
    await client.users.deleteUser(userId)
    revalidatePath("/")
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed"
    return { ok: false, error: msg }
  }
}
