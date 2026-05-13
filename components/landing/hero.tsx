import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HeroDemoShowcase } from "@/components/landing/hero-demo-showcase"

function HeroStatsRow() {
  return (
    <div className="mt-10 flex flex-row flex-wrap items-center justify-center gap-8 sm:gap-16">
      <div className="min-w-[5.5rem] text-center">
        <p className="text-4xl font-bold text-white">300+</p>
        <p className="mt-1 text-sm text-white/60">Unique scenarios</p>
      </div>
      <div className="hidden h-10 w-px shrink-0 bg-white/20 sm:block" aria-hidden />
      <div className="min-w-[5.5rem] text-center">
        <p className="text-4xl font-bold text-white">4</p>
        <p className="mt-1 text-sm text-white/60">Phases covered</p>
      </div>
      <div className="hidden h-10 w-px shrink-0 bg-white/20 sm:block" aria-hidden />
      <div className="min-w-[5.5rem] text-center">
        <p className="text-4xl font-bold text-white">$15</p>
        <p className="mt-1 text-sm text-white/60">Starting price</p>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section
      className="relative z-0 overflow-hidden bg-[#0a1628] px-4 pb-20 pt-10 sm:px-6 sm:pb-32 sm:pt-16 lg:px-8"
      style={{
        backgroundImage: "url(/sea-wolf-biolum-background.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[#0a1628]/85" aria-hidden />

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[2]"
        style={{
          height: "180px",
          background: "linear-gradient(to bottom, transparent 0%, #f0f4ff 100%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium tracking-wide text-white/60">McKinsey Solve · Sea Wolf · 2026 Format</p>

        <h1 className="mt-3 text-balance text-5xl font-bold tracking-tight text-white sm:mt-4 sm:text-6xl">
          Ace the McKinsey Solve.
          <br />
          $15. Not $239.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-white/80">
          The only prep tool covering all 4 phases — simulator and solver included. Built for candidates, by candidates.
        </p>

        <HeroStatsRow />
      </div>

      <div id="how-it-works" className="relative z-10 scroll-mt-20 mt-10 sm:mt-12 [&_h2]:text-white">
        <HeroDemoShowcase />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <p className="mx-auto mt-10 mb-8 max-w-2xl text-center text-lg font-medium text-white/80">
          No Excel. No macros. No $200 coaching sessions. Just the tool that works.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild className="bg-primary text-white hover:bg-primary/90">
            <Link href="#pricing">Get Access Now - from $15</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/sea-wolf-demo">Try Free Demo</Link>
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <Badge
            variant="secondary"
            className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/70 ring-0"
          >
            ✓ All 4 phases covered
          </Badge>
          <Badge
            variant="secondary"
            className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/70 ring-0"
          >
            ✓ One-time payment
          </Badge>
          <Badge
            variant="secondary"
            className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/70 ring-0"
          >
            ✓ Lifetime access
          </Badge>
        </div>
      </div>
    </section>
  )
}
