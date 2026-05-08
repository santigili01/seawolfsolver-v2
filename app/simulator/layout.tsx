import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Treatment Simulator | SeaWolfPrep",
  description: "Standalone Phase 4 treatment practice.",
}

export default function SimulatorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
