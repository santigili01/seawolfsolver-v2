import type { ReactNode } from "react"
import { requireSimulatorAccess } from "@/lib/require-simulator-access"

export default async function GameLayout({ children }: { children: ReactNode }) {
  await requireSimulatorAccess("/game")
  return <>{children}</>
}
