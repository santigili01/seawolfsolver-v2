import { Brain, Search, Calculator, BarChart2, RefreshCw, Infinity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: Brain,
    title: "Full 4-Phase Simulator",
    description: "Practice the complete Sea Wolf game, not just the final phase. 300+ unique scenario combinations.",
  },
  {
    icon: Search,
    title: "Phase 3 Solver",
    description: "The Prospect Pool is the hardest phase. Our solver shows you the optimal pick in every round.",
  },
  {
    icon: Calculator,
    title: "Phase 4 Solver",
    description: "Input your 10 microbes, get the optimal Treatment trio with full scoring breakdown.",
  },
  {
    icon: BarChart2,
    title: "Per-Phase Scoring",
    description: "See exactly where you lost points after every run. Phase-by-phase breakdown with specific feedback.",
  },
  {
    icon: RefreshCw,
    title: "2026 Format",
    description: "Built for the current McKinsey Solve format. Updated as McKinsey changes the game.",
  },
  {
    icon: Infinity,
    title: "Lifetime Access",
    description: "Pay once. Practice as many times as you need. No subscription, no expiry, no re-purchasing.",
  },
]

export function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-20 bg-card px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to walk in prepared
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <div className="mb-2 inline-flex w-fit rounded-md bg-primary/10 p-2 text-primary">
                  <feature.icon className="size-4" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
