import type { Metadata } from "next"
import { TreatmentSimulator } from "@/components/game/TreatmentSimulator"

export const metadata: Metadata = {
  title: "Treatment Simulator | SeaWolfPrep",
  description: "Practice Phase 4 treatment selection.",
}

export default function SeaWolfTreatmentPage() {
  return <TreatmentSimulator />
}
