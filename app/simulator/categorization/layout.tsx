import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Categorization Practice | SeaWolfPrep",
  description: "Practice the Categorization and Review phases.",
}

export default function CategorizationLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
