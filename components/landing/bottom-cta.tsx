import Link from "next/link"
import { Button } from "@/components/ui/button"

const STEPS = [
  { n: "1", title: "Create an account", desc: "It's free" },
  { n: "2", title: "Get access", desc: "From $15 · one-time" },
  { n: "3", title: "Start practicing", desc: "300+ scenarios" },
] as const

export function BottomCTA() {
  return (
    <section className="relative z-0 w-full bg-[#1a202c]">
      <div className="mx-auto max-w-[79.2rem] px-[2.2rem] py-[2.75rem] sm:py-[3.3rem]">
        <div className="grid grid-cols-1 items-center gap-[5.72rem] lg:grid-cols-2">
          <div className="flex flex-col justify-center gap-[1.65rem]">
            <h2 className="text-left text-[2.0625rem] font-bold leading-snug tracking-tight text-white lg:text-[2.475rem]">
              The candidates you&apos;re
              <br />
              <span className="text-[#ef4444]">competing</span> against
              <br />
              are already preparing.
            </h2>
            <p className="max-w-[46.2rem] text-left text-[0.9625rem] leading-relaxed text-white/70 lg:text-[1.1rem]">
              McKinsey Solve is scored on a curve — your result depends not just on how well you do, but how well everyone else does. Top
              scorers use tools. They know the phases, the traps, and the optimal moves before they sit down. <strong>You should too.</strong>
            </p>
            <p className="text-left text-[1.2375rem] font-semibold text-white/90">Your interview is closer than you think.</p>
          </div>

          <div className="flex flex-col justify-center gap-[1.485rem] text-center">
            <div className="relative isolate py-[0.675rem]">
              <div
                className="pointer-events-none absolute -inset-[27px] -z-10"
                style={{
                  backgroundImage: "radial-gradient(circle, rgba(255, 255, 255, 0.2) 1px, transparent 1px)",
                  backgroundPosition: "center",
                  backgroundSize: "15px 15px",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, transparent 0px, #000 27px, #000 calc(100% - 27px), transparent 100%), linear-gradient(to right, transparent 0px, #000 27px, #000 calc(100% - 27px), transparent 100%)",
                  WebkitMaskComposite: "source-in",
                  WebkitMaskRepeat: "no-repeat, no-repeat",
                  WebkitMaskSize: "100% 100%, 100% 100%",
                  maskImage:
                    "linear-gradient(to bottom, transparent 0px, #000 27px, #000 calc(100% - 27px), transparent 100%), linear-gradient(to right, transparent 0px, #000 27px, #000 calc(100% - 27px), transparent 100%)",
                  maskComposite: "intersect",
                  maskRepeat: "no-repeat, no-repeat",
                  maskSize: "100% 100%, 100% 100%",
                }}
                aria-hidden
              />
              <div className="relative grid grid-cols-3 justify-items-center gap-[0.99rem]">
                <div className="flex min-w-0 flex-col items-center gap-[0.2475rem] text-center">
                  <p className="whitespace-nowrap text-[1.85625rem] font-bold text-white">300+</p>
                  <p className="text-[0.7425rem] text-white/60">Practice scenarios</p>
                </div>
                <div className="flex min-w-0 flex-col items-center gap-[0.2475rem] text-center">
                  <p className="whitespace-nowrap text-[1.85625rem] font-bold text-white">4 Phases</p>
                  <p className="text-[0.7425rem] text-white/60">Fully covered</p>
                </div>
                <div className="flex min-w-0 flex-col items-center gap-[0.2475rem] text-center">
                  <p className="whitespace-nowrap text-[1.85625rem] font-bold text-white">5–10×</p>
                  <p className="text-[0.7425rem] text-white/60">Cheaper than alternatives</p>
                </div>
              </div>
            </div>

            <div className="relative mx-auto flex w-full max-w-[41.58rem] flex-col items-start justify-center gap-[0.495rem] sm:flex-row sm:gap-0">
              <div
                className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-[0.99rem] hidden h-px bg-white/20 sm:block"
                aria-hidden
              />
              {STEPS.map((step) => (
                <div key={step.n} className="relative z-10 flex flex-1 flex-col items-center text-center">
                  <div className="mb-[0.495rem] flex size-[1.98rem] shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-[0.7425rem] font-bold text-[#1a202c] shadow-sm">
                    {step.n}
                  </div>
                  <p className="mb-[0.2475rem] text-[0.86625rem] font-semibold text-white">{step.title}</p>
                  <p className="text-[0.7425rem] text-white/60">{step.desc}</p>
                </div>
              ))}
            </div>

            <p className="text-center text-[0.9095625rem] font-bold text-white/70">Score in the top 10%.</p>

            <Button
              asChild
              className="w-full origin-center scale-[0.891] bg-white px-[2.475rem] py-[0.99rem] text-[0.99rem] font-semibold text-foreground hover:bg-white/90"
            >
              <Link href="#pricing">Get Your Best Score — from $15</Link>
            </Button>

            <div className="flex flex-col items-center gap-0 text-center">
              <p className="text-[0.86625rem] text-white/60">Still not sure?</p>
              <Link href="/sea-wolf-demo" className="block text-[0.86625rem] text-white/60 underline">
                Try the free demo first →
              </Link>
            </div>

            <p className="text-center text-[0.7425rem] text-white/40">
              One-time payment · Lifetime access · Not affiliated with McKinsey & Company
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
