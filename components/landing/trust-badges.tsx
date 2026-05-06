import { Globe, Shuffle, Infinity } from "lucide-react"

const badges = [
  {
    icon: Globe,
    title: "Browser-Native",
    description: "No Excel. No macros. No malware risk. Open a tab and practice.",
  },
  {
    icon: Shuffle,
    title: "Phases 3 & 4 Solved",
    description: "Most tools only solve Treatment. We optimize your Prospect Pool too.",
  },
  {
    icon: Infinity,
    title: "300+ Scenarios",
    description: "Virtually unlimited practice. One-time payment, practice forever.",
  },
]

export function TrustBadges() {
  return (
    <section className="bg-[#f8fafc] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-3">
          {badges.map((badge) => (
            <div key={badge.title} className="flex items-start gap-3">
              <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
                <badge.icon className="size-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{badge.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{badge.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
