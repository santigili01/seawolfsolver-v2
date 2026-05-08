import Link from "next/link"
import type { Metadata } from "next"
import { SeawolfSolver } from "@/components/seawolf-solver"

export const metadata: Metadata = {
  title: "Sea Wolf Solver | SeaWolfPrep",
  description:
    "Manual-input solver for all 4 phases of the McKinsey Solve Sea Wolf assessment.",
}

export default function SolverPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#4ECDC4] to-[#2BA8A0]">
      <header className="w-full bg-[#1a202c] px-6 py-4">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <div className="text-lg font-bold text-white">SeaWolfPrep</div>
          <Link href="/practice/sea-wolf" className="text-sm font-semibold text-[#4ECDC4] hover:underline">
            Back to Game
          </Link>
        </div>
      </header>
      <main className="h-[calc(100vh-68px)] overflow-y-auto p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1500px]">
          <SeawolfSolver />
        </div>
      </main>
    </div>
  )
}
