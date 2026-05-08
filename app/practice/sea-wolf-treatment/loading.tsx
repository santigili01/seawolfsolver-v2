import { Loader2 } from "lucide-react"

export default function TreatmentSimulatorLoading() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#4ECDC4] via-[#3EBDB5] to-[#2BA8A0]">
      <Loader2 className="h-12 w-12 animate-spin text-white" aria-label="Loading" />
    </main>
  )
}
