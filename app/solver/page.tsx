import { AppSidebar } from "@/components/app-sidebar"
import { SeawolfSolver } from "@/components/seawolf-solver"

export default function SolverPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 flex">
        <SeawolfSolver />
      </main>
    </div>
  )
}
