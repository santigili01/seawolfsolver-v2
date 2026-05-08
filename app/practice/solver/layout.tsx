import type { ReactNode } from "react"
import { requireSolverAccess } from "@/lib/require-solver-access"

export default async function PracticeSolverLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireSolverAccess("/practice/solver")
  return <>{children}</>
}
