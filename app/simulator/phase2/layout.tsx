import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Prospect Pool Practice | SeaWolfPrep",
  description: "Practice building your Prospect Pool.",
}

export default function Phase2Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
