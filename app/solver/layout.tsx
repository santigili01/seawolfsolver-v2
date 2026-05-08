import type { ReactNode } from "react"
import { requireSolverAccess } from "@/lib/require-solver-access"

export default async function SolverLayout({ children }: { children: ReactNode }) {
  await requireSolverAccess("/solver")
  return <>{children}</>
}
