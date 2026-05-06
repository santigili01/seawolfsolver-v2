import { LayoutGrid, Search, Calculator, Lightbulb, RefreshCw, Infinity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: LayoutGrid,
    title: "Full 4-Phase Simulator",
    description: "Practice all 4 phases of the real Sea Wolf assessment: Profiling, Categorization, Prospect Pool, and Treatment. 300+ unique scenarios.",
  },
  {
    icon: Search,
    title: "Phase 3 Prospect Pool Solver",
    description: "The hardest phase. The solver shows you the optimal candidate pick in every round — the move that maximises your final pool score.",
  },
  {
    icon: Calculator,
    title: "Phase 4 Treatment Solver",
    description: "Input your 10 microbes. Get the optimal trio with full scoring breakdown across all 5 conditions.",
  },
  {
    icon: Lightbulb,
    title: "Deepest Insights on the Market",
    description: "Every run ends with a full decision-level breakdown. Know exactly which choice cost you points and what the optimal move was.",
  },
  {
    icon: RefreshCw,
    title: "Built for 2026",
    description: "Covers the current McKinsey Solve format. Updated as the assessment changes. Check the changelog for the latest.",
  },
  {
    icon: Infinity,
    title: "Lifetime Access",
    description: "Pay once. Practice as many times as you need. No subscription, no expiry. Future phases (Redrock, SFL) included free when released.",
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
          <p className="mt-4 text-lg text-muted-foreground">Simulator and solver. Both cover all 4 phases.</p>
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
