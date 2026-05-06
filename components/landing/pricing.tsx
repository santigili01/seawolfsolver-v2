import Link from "next/link"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function Pricing() {
  return (
    <section
      id="pricing"
      className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple pricing. No subscriptions.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Pay once. Practice forever. Prices will increase as we grow — lock in launch pricing now.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-4 md:grid-cols-2">
          <Card className="border-border shadow-sm">
            <CardHeader className="space-y-2">
              <Badge variant="secondary" className="w-fit">
                For serious practice
              </Badge>
              <CardTitle className="text-xl">Simulator</CardTitle>
              <div className="text-4xl font-bold text-foreground">$15</div>
              <p className="text-sm text-muted-foreground">One-time · Lifetime access</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="space-y-2">
                {[
                  "300+ unique scenarios",
                  "All 4 phases simulated",
                  "Full per-phase scoring & insights",
                  "Lifetime access & updates",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-foreground">
                    <Check className="mt-0.5 size-4 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2 text-muted-foreground">
                  <X className="mt-0.5 size-4 text-red-500" />
                  <span>Phase 3 & 4 solver not included</span>
                </li>
              </ul>
              <Button asChild className="mt-2 w-full">
                <Link href="/pricing">Get Simulator — $15</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/40 shadow-md ring-1 ring-primary/20">
            <CardHeader className="space-y-2">
              <Badge className="w-fit bg-primary text-primary-foreground">
                Most popular · Best value
              </Badge>
              <p className="text-xs font-medium text-muted-foreground">SolvePrep charges $50 for solver alone.</p>
              <CardTitle className="text-xl">Simulator + Solver</CardTitle>
              <div className="text-4xl font-bold text-foreground">$25</div>
              <p className="text-sm text-muted-foreground">One-time · Lifetime access</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="space-y-2">
                {[
                  "Everything in Simulator",
                  "Phase 3 Prospect Pool solver",
                  "Phase 4 Treatment solver",
                  "Optimal pick explanations",
                  "Lifetime access & updates",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-foreground">
                    <Check className="mt-0.5 size-4 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-2 w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/pricing">Get Simulator + Solver — $25</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            {["Visa", "Mastercard", "PayPal", "Amex", "Apple Pay", "Google Pay"].map((m) => (
              <span key={m} className="rounded-full border border-border bg-card px-2.5 py-1">
                {m}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            🔒 Secure checkout · 14-day refund if unused · Not affiliated with McKinsey & Company
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Not ready to buy? Play one full Sea Wolf scenario free — no signup, full insights included.{" "}
            <Link href="/simulator" className="font-medium text-primary hover:underline">
              → Try Free Demo
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
