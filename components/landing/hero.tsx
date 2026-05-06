import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--muted-foreground)/0.12)_1px,transparent_0)] bg-[size:22px_22px] opacity-30" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground">McKinsey Solve · Sea Wolf · 2026 Format</p>

        <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Practice McKinsey Sea Wolf.
          <br />
          In your browser. Right now.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
          The only simulator that covers all 4 phases — including Phase 3 Prospect Pool. 300+ scenarios. Browser-native, no Excel, no downloads. From $15.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/simulator">Play Free Demo →</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#pricing">See Pricing</Link>
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <Badge variant="secondary" className="rounded-full bg-card px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border">
            ✓ No signup required
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
