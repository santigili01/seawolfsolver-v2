import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { userHasSolverAccess } from "@/lib/access"

/** Clerk session + Solver-eligible purchase (bundle and/or standalone solver variant). */
export async function requireSolverAccess(redirectAfterSignIn: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectAfterSignIn)}`)
  }
  const ok = await userHasSolverAccess(userId)
  if (!ok) {
    redirect("/pricing")
  }
}
