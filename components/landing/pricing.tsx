import Link from "next/link"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export type PricingCTALinks = {
  simulator: string
  simulatorSolver: string
}

type PricingProps = {
  /** Defaults both CTAs to `/pricing` (home anchor section). Pass Lemon/checkout URLs from `/pricing` server page. */
  ctaLinks?: PricingCTALinks
  /** Set false on standalone `/pricing` so `#pricing` is only on the home page */
  sectionId?: string | false
}

export function Pricing({ ctaLinks, sectionId = "pricing" }: PricingProps) {
  const simHref = ctaLinks?.simulator ?? "/pricing"
  const bundleHref = ctaLinks?.simulatorSolver ?? "/pricing"

  return (
    <section
      {...(sectionId === false ? {} : { id: sectionId })}
      className="scroll-mt-20 bg-[linear-gradient(to_bottom,#f8fafc_0%,#f0f4ff_14%,#d8e2ff_52%,#c9d5f8_100%)] px-4 py-16 sm:px-6 sm:py-24 lg:px-8 dark:bg-[linear-gradient(to_bottom,#0f172a_0%,#1e293b_52%,#1e293b_100%)]"
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Pass for the price of a textbook, not a coach.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Transparent product. Transparent prices. First 50 buyers lock in launch pricing.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 items-stretch gap-4 md:grid-cols-2">
          <Card className="flex h-full flex-col border-border shadow-sm">
            <CardHeader className="flex flex-col gap-2 space-y-0">
              <div className="flex min-h-[80px] flex-col gap-2 md:min-h-[12rem]">
                <Badge variant="secondary" className="w-fit">
                  For serious practice
                </Badge>
                <CardTitle className="text-xl">Simulator</CardTitle>
                <div className="text-4xl font-bold text-foreground">$15</div>
                <p className="text-sm text-muted-foreground">One-time · Lifetime access</p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col text-sm">
              <ul className="flex-1 space-y-2">
                {[
                  "All 4 phases simulated",
                  "300+ unique scenarios",
                  "Full per-phase scoring",
                  "Deepest insights on the market",
                  "Behavioural tracking",
                  "Lifetime access & updates",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2 text-muted-foreground">
                  <X className="mt-0.5 size-4 shrink-0 text-red-500" />
                  <span>4-phase solver not included</span>
                </li>
              </ul>
              <Button asChild className="mt-auto w-full">
                <Link href={simHref}>Get Simulator — $15</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col border-primary/40 shadow-md ring-1 ring-primary/20">
            <CardHeader className="flex flex-col gap-2 space-y-0 text-center">
              <div className="mx-auto flex w-full min-h-[80px] max-w-sm flex-col items-center gap-2 md:min-h-[12rem]">
                <Badge className="w-fit bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
                  Most Popular · Best Value
                </Badge>
                <p className="text-sm font-medium text-muted-foreground">
                  Leading prep tools charge $150–240.
                  <br />
                  We charge $25.
                </p>
                <CardTitle className="text-xl">Simulator + Solver</CardTitle>
                <div className="text-4xl font-bold text-foreground">$25</div>
                <p className="text-sm text-muted-foreground">One-time · Lifetime access</p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col text-sm">
              <ul className="flex-1 space-y-2">
                {[
                  "Everything in Simulator",
                  "The only 4-phase solver on the market",
                  "Optimal solution for every phase, every step",
                  "Future tools included free (Redrock, SFL) — limited time",
                  "Lifetime access & updates",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-auto w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href={bundleHref}>Get Simulator + Solver — $25</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            {["Visa", "Mastercard", "PayPal", "Amex", "Apple Pay", "Google Pay"].map((m) => (
              <span key={m} className="rounded-full border border-border bg-card px-2.5 py-1">
                {m}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            🔒 Secure checkout · 14-day refund* · Not affiliated with McKinsey & Company
          </p>
          <p className="mt-2 text-center text-[6px] leading-tight text-muted-foreground">*Conditions apply.</p>
        </div>
      </div>
    </section>
  )
}
