import { Monitor, LayoutGrid, Lightbulb } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const badges = [
  {
    icon: Monitor,
    title: "Browser-Native",
    description:
      "No Excel. No macros. No malware risk. Open a tab and start practicing.",
  },
  {
    icon: LayoutGrid,
    title: "All 4 Phases. Every Tool.",
    description:
      "Simulator and solver both cover all 4 phases. We're the only prep tool on the market that does.",
  },
  {
    icon: Lightbulb,
    title: "Deepest Insights on the Market",
    description:
      "Full decision-level feedback after every run. See exactly which move cost you points and what the optimal play was.",
  },
]

export function TrustBadges() {
  return (
    <section className="relative z-0 scroll-mt-20 bg-[#f8fafc] px-4 py-16 sm:px-6 sm:py-24 lg:px-8 dark:bg-slate-950/80">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
          {badges.map((badge) => (
            <Card
              key={badge.title}
              className="flex h-full flex-col rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <CardHeader className="pb-3">
                <div className="mb-2 inline-flex w-fit rounded-md bg-primary/10 p-2 text-primary">
                  <badge.icon className="size-7" />
                </div>
                <CardTitle className="text-base font-semibold">{badge.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">{badge.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
