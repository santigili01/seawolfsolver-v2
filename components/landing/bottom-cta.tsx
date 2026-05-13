import Link from "next/link"
import { Button } from "@/components/ui/button"

export function BottomCTA() {
  return (
    <section className="relative z-0 w-full bg-[#1a202c] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mt-0 text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl md:text-4xl">
          The candidates you&apos;re competing against are already preparing.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-white/70">
          McKinsey Solve is scored on a curve — your result depends not just on how well you do, but how well everyone else does. Top
          scorers use simulators. They know the phases, the traps, and the optimal moves before they sit down. You should too.
        </p>

        <div className="mx-auto mt-10 flex max-w-xl flex-col items-stretch gap-8 sm:flex-row sm:items-center sm:justify-center sm:gap-0">
          <div className="flex flex-1 flex-col items-center px-2 text-center">
            <p className="text-4xl font-bold text-white">300+</p>
            <p className="mt-1 text-sm text-white/60">Practice scenarios</p>
          </div>
          <div className="hidden h-10 w-px shrink-0 bg-white/20 sm:block" aria-hidden />
          <div className="flex flex-1 flex-col items-center px-2 text-center">
            <p className="text-4xl font-bold text-white">4 Phases</p>
            <p className="mt-1 text-sm text-white/60">Fully covered</p>
          </div>
          <div className="hidden h-10 w-px shrink-0 bg-white/20 sm:block" aria-hidden />
          <div className="flex flex-1 flex-col items-center px-2 text-center">
            <p className="text-4xl font-bold text-white">5–10×</p>
            <p className="mt-1 text-sm text-white/60">Cheaper than alternatives</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4">
          <Button size="lg" asChild className="w-full max-w-md bg-white text-foreground hover:bg-white/90 sm:w-auto sm:min-w-[280px]">
            <Link href="#pricing">Get Your Best Score — $25</Link>
          </Button>
          <Link href="/sea-wolf-demo" className="text-sm text-white/70 underline underline-offset-2 hover:text-white">
            Try the free demo first →
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          One-time payment · Lifetime access · Not affiliated with McKinsey & Company
        </p>
      </div>
    </section>
  )
}
