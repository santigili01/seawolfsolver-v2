import { Loader2 } from "lucide-react"

export default function TreatmentSimulatorLoading() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-transparent">
      <Loader2 className="h-12 w-12 animate-spin text-white" aria-label="Loading" />
    </main>
  )
}
