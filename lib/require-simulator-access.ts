import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { userHasAccess } from "@/lib/access"

/** Clerk session + Simulator or Simulator+Solver purchase required for /game */
export async function requireSimulatorAccess(redirectAfterSignIn: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectAfterSignIn)}`)
  }
  const ok = await userHasAccess(userId)
  if (!ok) {
    redirect("/pricing")
  }
}
