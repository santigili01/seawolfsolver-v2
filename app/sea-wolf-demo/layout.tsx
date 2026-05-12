import type { Metadata } from "next"
import { SeaWolfBiolumScreen } from "@/components/game/SeaWolfBiolumScreen"

export const metadata: Metadata = {
  title: "Sea Wolf Free Demo | SeaWolfPrep",
  description: "Try one site of the Sea Wolf simulator—fixed scenario, no account required.",
}

export default function SeaWolfDemoLayout({ children }: { children: React.ReactNode }) {
  return <SeaWolfBiolumScreen>{children}</SeaWolfBiolumScreen>
}
