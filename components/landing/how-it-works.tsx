import { UserSearch, FolderTree, Layers, Calculator } from "lucide-react"

const steps = [
  {
    icon: UserSearch,
    title: "Profiling",
    description: "Select 2 microbe characteristics matching the site's needs.",
    accent: false,
  },
  {
    icon: FolderTree,
    title: "Categorization",
    description: "Sort 10 microbes across 3 sites based on limited information.",
    accent: false,
  },
  {
    icon: Layers,
    title: "Prospect Pool",
    description: "Build your pool of 10 from 4 rounds of choices. This is where most candidates lose points.",
    accent: true,
  },
  {
    icon: Calculator,
    title: "Treatment",
    description: "Pick the optimal 3 microbes. Our solver finds the perfect combination instantly.",
    accent: true,
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How Sea Wolf Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Four phases. One score. We help you nail all of them.
          </p>
        </div>

        <div className="relative mt-14 grid gap-5 md:grid-cols-4">
          <div className="absolute left-0 right-0 top-8 hidden h-px bg-border md:block" />
          {steps.map((step, index) => (
            <div key={step.title} className="relative rounded-xl border border-border bg-card p-5 text-left shadow-sm">
              <div className="relative z-10 inline-flex rounded-lg border border-border bg-background p-2">
                <step.icon className={`size-5 ${step.accent ? "text-[#4ECDC4]" : "text-primary"}`} />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">0{index + 1}</span>
                {step.accent ? (
                  <span className="rounded-full bg-[#4ECDC4]/15 px-2 py-0.5 text-[10px] font-semibold text-[#0f766e]">
                    Solver
                  </span>
                ) : null}
              </div>
              <h3 className="mt-2 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
