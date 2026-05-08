import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Profiling Practice | SeaWolfPrep",
  description: "Practice the Profiling phase.",
}

export default function ProfilingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
