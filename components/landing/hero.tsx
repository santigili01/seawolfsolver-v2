import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HeroDemoShowcase } from "@/components/landing/hero-demo-showcase"

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pl-4 pr-4 pt-0 sm:pb-24 sm:pl-6 sm:pr-6 sm:pt-0 lg:pb-28 lg:pl-4 lg:pr-8 lg:pt-0">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--muted-foreground)/0.12)_1px,transparent_0)] bg-[size:22px_22px] opacity-30" />
      </div>

      <div className="relative mx-auto max-w-6xl text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground">McKinsey Solve · Sea Wolf · 2026 Format</p>

        <h1 className="mt-3 text-balance text-[2.025rem] font-bold leading-tight tracking-tight text-foreground sm:mt-4 sm:text-[2.7rem] lg:text-[3.375rem]">
          Ace the McKinsey Solve.
          <br />
          $15. Not $239.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
          The only prep tool covering all 4 phases — simulator and solver included. Built for candidates, by candidates. Pass for the
          price of a textbook, not a coach.
        </p>

        <div id="how-it-works" className="scroll-mt-24 border-t border-border pt-10 mt-10">
          <HeroDemoShowcase />
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
