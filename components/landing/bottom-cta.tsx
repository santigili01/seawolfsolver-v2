import Link from "next/link"
import { Button } from "@/components/ui/button"

const STEPS = [
  { n: "1", title: "Create an account", desc: "It's free" },
  { n: "2", title: "Get access", desc: "From $15 · one-time" },
  { n: "3", title: "Start practicing", desc: "300+ scenarios" },
] as const

export function BottomCTA() {
  return (
    <section className="relative z-0 w-full bg-[#1a202c] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mt-0 text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl md:text-4xl">
          The candidates you&apos;re <span className="text-[#ef4444]">competing</span> against are already preparing.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-white/70">
          McKinsey Solve is scored on a curve — your result depends not just on how well you do, but how well everyone else does. Top
          scorers use tools. They know the phases, the traps, and the optimal moves before they sit down. <strong>You should too.</strong>
        </p>

        <div className="mx-auto mt-10 flex w-full justify-center">
          <div className="inline-flex w-full max-w-3xl origin-center scale-[0.85] flex-col items-stretch gap-8 sm:flex-row sm:items-center sm:justify-center sm:gap-0">
            <div className="flex min-w-0 flex-1 flex-col items-center px-3 text-center sm:min-w-[9.5rem]">
              <p className="whitespace-nowrap text-4xl font-bold text-white">300+</p>
              <p className="mt-1 text-sm text-white/60">Practice scenarios</p>
            </div>
            <div className="hidden h-10 w-px shrink-0 bg-white/20 sm:block" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col items-center px-3 text-center sm:min-w-[9.5rem]">
              <p className="whitespace-nowrap text-4xl font-bold text-white">4 Phases</p>
              <p className="mt-1 text-sm text-white/60">Fully covered</p>
            </div>
            <div className="hidden h-10 w-px shrink-0 bg-white/20 sm:block" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col items-center px-3 text-center sm:min-w-[9.5rem]">
              <p className="whitespace-nowrap text-4xl font-bold text-white">5–10×</p>
              <p className="mt-1 text-sm text-white/60">Cheaper than alternatives</p>
            </div>
          </div>
        </div>

        <p className="mb-8 mt-10 text-center text-xl font-semibold text-white/90">Your interview is closer than you think.</p>

        <div className="relative mx-auto mt-12 flex max-w-2xl flex-col items-start justify-center gap-8 sm:flex-row sm:gap-0">
          <div
            className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-[17px] hidden h-px bg-white/20 sm:block"
            aria-hidden
          />
          {STEPS.map((step) => (
            <div key={step.n} className="relative z-10 flex flex-1 flex-col items-center text-center">
              <div className="mb-3 flex size-[2.125rem] shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-xs font-bold text-[#1a202c] shadow-sm">
                {step.n}
              </div>
              <p className="mb-1 text-sm font-semibold text-white">{step.title}</p>
              <p className="text-xs text-white/60">{step.desc}</p>
            </div>
          ))}
        </div>

        <p className="mb-8 mt-6 text-center text-sm font-medium italic text-white/70">Score in the top 10%.</p>

        <Button
          asChild
          className="w-full max-w-md origin-center scale-90 bg-white px-10 py-4 text-base font-semibold text-foreground hover:bg-white/90 sm:w-auto sm:min-w-[280px]"
        >
          <Link href="#pricing">Get Your Best Score — $15</Link>
        </Button>

        <p className="mt-4 text-center text-sm text-white/60">Still not sure?</p>
        <Link href="/sea-wolf-demo" className="mt-4 block text-center text-sm text-white/60 underline">
          Try the free demo first →
        </Link>

        <p className="mt-6 text-center text-xs text-white/40">
          One-time payment · Lifetime access · Not affiliated with McKinsey & Company
        </p>
      </div>
    </section>
  )
}
