import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HeroDemoShowcase } from "@/components/landing/hero-demo-showcase"

function HeroStatsRow() {
  return (
    <div className="mt-10 flex flex-row flex-wrap items-center justify-center gap-8 sm:gap-16">
      <div className="min-w-[5.5rem] text-center">
        <p className="text-4xl font-bold text-foreground">300+</p>
        <p className="mt-1 text-sm text-muted-foreground">Unique scenarios</p>
      </div>
      <div className="hidden h-10 w-px shrink-0 bg-border sm:block" aria-hidden />
      <div className="min-w-[5.5rem] text-center">
        <p className="text-4xl font-bold text-foreground">4</p>
        <p className="mt-1 text-sm text-muted-foreground">Phases covered</p>
      </div>
      <div className="hidden h-10 w-px shrink-0 bg-border sm:block" aria-hidden />
      <div className="min-w-[5.5rem] text-center">
        <p className="text-4xl font-bold text-foreground">$15</p>
        <p className="mt-1 text-sm text-muted-foreground">Starting price</p>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative z-0 overflow-hidden bg-background px-4 pb-20 pt-10 sm:px-6 sm:pb-32 sm:pt-16 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--muted-foreground)/0.12)_1px,transparent_0)] bg-[size:22px_22px] opacity-30" />
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-20 bg-gradient-to-b from-transparent to-[hsl(var(--background))]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium tracking-wide text-foreground/60">McKinsey Solve · Sea Wolf · 2026 Format</p>

        <h1 className="mt-3 text-balance text-5xl font-bold tracking-tight text-foreground sm:mt-4 sm:text-6xl">
          Ace the McKinsey Solve.
          <br />
          $15. Not $239.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
          The only prep tool covering all 4 phases — simulator and solver included. Built for candidates, by candidates.
        </p>

        <HeroStatsRow />
      </div>

      <div id="how-it-works" className="relative z-10 scroll-mt-20 mt-10 sm:mt-12">
        <HeroDemoShowcase />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <p className="mx-auto mt-10 mb-8 max-w-2xl text-center text-lg font-medium text-foreground">
          No Excel. No macros. No $200 coaching sessions. Just the tool that works.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="#pricing">Get Access Now - from $15</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/sea-wolf-demo">Try Free Demo</Link>
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <Badge variant="secondary" className="rounded-full bg-card px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border">
            ✓ All 4 phases covered
          </Badge>
          <Badge variant="secondary" className="rounded-full bg-card px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border">
            ✓ One-time payment
          </Badge>
          <Badge variant="secondary" className="rounded-full bg-card px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border">
            ✓ Lifetime access
          </Badge>
        </div>
      </div>
    </section>
  )
}
