import { Monitor, Lightbulb, BarChart2, Activity, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

const solverSteps = [
  {
    title: "Open the solver",
    description: "Browser-based. No download, no setup.",
  },
  {
    title: "Input your starting conditions",
    description: "Enter the microbes and site requirements for each phase.",
  },
  {
    title: "Get the optimal solution",
    description: "The solver calculates the best move for every step of every phase.",
  },
  {
    title: "Score 100%",
    description: "Walk into your assessment knowing exactly what to do.",
  },
]

const simulatorCards = [
  {
    icon: Monitor,
    title: "High Resemblance",
    description: "Built to mirror the real McKinsey Solve interface. Get comfortable before test day.",
  },
  {
    icon: Lightbulb,
    title: "Deepest Insights",
    description: "More feedback per run than any other prep tool. See exactly why you lost points and how to fix it.",
  },
  {
    icon: BarChart2,
    title: "Full Score Breakdown",
    description: "Phase-by-phase scoring with specific decision-level feedback after every run.",
  },
  {
    icon: Activity,
    title: "Behavioural Tracking",
    description: "McKinsey doesn't just score your answers — it tracks your decision patterns. Our simulator does too.",
    comingSoon: true,
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Get the optimal answer. Instantly.</h2>
          <p className="mt-3 text-lg text-muted-foreground">Four steps to a perfect score.</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {solverSteps.map((step, index) => (
            <Card key={step.title} className="border-border bg-card shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <span>0{index + 1}</span>
                  {index < solverSteps.length - 1 ? <ArrowRight className="size-3" /> : null}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16">
          <h3 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Practice until it's instinct.</h3>
          <p className="mt-3 text-lg text-muted-foreground">300+ scenarios. The most realistic Sea Wolf prep available.</p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {simulatorCards.map((item) => (
            <Card key={item.title} className="border-border bg-card shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="inline-flex rounded-md bg-primary/10 p-2 text-primary">
                    <item.icon className="size-4" />
                  </div>
                  {item.comingSoon ? (
                    <Badge variant="outline" className="border-[#4ECDC4]/40 bg-[#4ECDC4]/10 text-[#0f766e]">
                      Coming soon
                    </Badge>
                  ) : null}
                </div>
                <h4 className="mt-3 text-lg font-semibold text-foreground">{item.title}</h4>
                {/* COMING SOON — behavioural tracking not yet implemented. Remove 'coming soon' badge when shipped. */}
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
