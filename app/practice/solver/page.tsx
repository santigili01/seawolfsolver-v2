import Link from "next/link"
import type { Metadata } from "next"
import { cn } from "@/lib/utils"
import { SeawolfSolver } from "@/components/seawolf-solver"
import {
  SiteLogoMark,
  SITE_BRAND_LOCKUP_ROOT_CLASS,
  SITE_BRAND_WORDMARK_CLASS,
} from "@/components/site-logo-mark"

export const metadata: Metadata = {
  title: "Sea Wolf Solver | SeaWolfPrep",
  description:
    "Manual-input solver for all 4 phases of the McKinsey Solve Sea Wolf assessment.",
}

export default function SolverPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#4ECDC4] to-[#2BA8A0]">
      <header className="w-full shrink-0 bg-[#1a202c] px-4 py-4 md:px-6">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between">
          <div
            className={cn(
              "flex min-w-0 items-center gap-1",
              SITE_BRAND_LOCKUP_ROOT_CLASS
            )}
          >
            <SiteLogoMark />
            <span className={cn(SITE_BRAND_WORDMARK_CLASS, "text-white")}>SeaWolfPrep</span>
          </div>
          <Link href="/practice" className="text-sm font-semibold text-[#4ECDC4] hover:underline">
            Back to Practice
          </Link>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1500px]">
          <SeawolfSolver />
        </div>
      </main>
    </div>
  )
}
