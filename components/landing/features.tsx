import { LayoutGrid, Sparkles, Activity, Lightbulb, RefreshCw, Infinity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FounderNote } from "@/components/landing/founder-note"

const features = [
  {
    icon: LayoutGrid,
    title: "Full 4-Phase Simulator",
    description:
      "Practice all 4 phases of the real Sea Wolf assessment. 300+ unique scenarios, virtually unlimited practice.",
  },
  {
    icon: Sparkles,
    title: "The Only 4-Phase Solver",
    description:
      "Every other solver stops at Prospect Pool or Treatment. Ours covers all 4 phases. Input your conditions, get the optimal move for every single step.",
  },
  {
    icon: Activity,
    title: "Behavioural Tracking",
    description:
      "McKinsey doesn't just score your answers — it tracks how you make decisions. Our simulator does too. See your decision patterns after every run.",
  },
  {
    icon: Lightbulb,
    title: "Deepest Insights on the Market",
    description:
      "Decision-level feedback on every run. Not just your score — exactly why you lost points and what the optimal move was.",
  },
  {
    icon: RefreshCw,
    title: "Built for 2026",
    description: "Covers the current McKinsey Solve format. Updated as the assessment changes.",
  },
  {
    icon: Infinity,
    title: "Lifetime Access",
    description:
      "Pay once. Practice forever. Future tools (Redrock, SFL) included free for current buyers — limited time.",
  },
]

export function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-20 bg-background px-4 pb-0 pt-16 sm:px-6 sm:pt-24 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="mt-0 mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to walk in prepared
          </h2>
          <p className="mb-12 text-lg text-muted-foreground">Every feature you need. Nothing you don&apos;t.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      <FounderNote />
    </section>
  )
}
