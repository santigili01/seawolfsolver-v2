import { Dna, Zap, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Dna,
    title: "Input Microbe Data",
    description: "Enter the 10 microbes shown on your assessment screen",
    step: "01",
  },
  {
    icon: Zap,
    title: "Get Optimal Selection",
    description: "The solver evaluates all 120 combinations instantly",
    step: "02",
  },
  {
    icon: CheckCircle,
    title: "Score 100",
    description: "Pick the recommended 3 microbes and ace the game",
    step: "03",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Three simple steps to maximize your McKinsey Solve score
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-12 hidden h-0.5 w-full bg-border sm:block" />
              )}

              <div className="relative flex flex-col items-center text-center">
                {/* Step number */}
                <div className="absolute -top-3 right-1/2 translate-x-1/2 text-xs font-bold text-primary sm:-top-6 sm:right-0 sm:translate-x-0">
                  {step.step}
                </div>

                {/* Icon container */}
                <div className="relative z-10 flex size-20 items-center justify-center rounded-2xl border border-border bg-card shadow-lg shadow-primary/5">
                  <step.icon className="size-10 text-primary" />
                </div>

                {/* Content */}
                <h3 className="mt-6 text-xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
