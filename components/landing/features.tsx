import Link from "next/link";
import { Check, Monitor, FileSpreadsheet, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  "Web solver — instant results in your browser",
  "Excel solver — full formula engine, no macros",
  "Free simulator — practice with real scenarios",
  "Evaluates all 120 microbe combinations",
  "Full score breakdown per condition",
  "Works for every Seawolf scenario",
  "One-time payment, lifetime access + updates",
];

export function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-20 bg-card px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left column - Features list */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything You Need to Score 100
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A complete toolkit designed to help you ace the McKinsey Solve
              assessment
            </p>

            <ul className="mt-8 space-y-4">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary">
                    <Check className="size-3 text-primary-foreground" />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button className="mt-8" size="lg" asChild>
              <Link href="#pricing">Get Instant Access</Link>
            </Button>
          </div>

          {/* Right column - Product mockup */}
          <div className="relative">
            <div className="overflow-hidden rounded-xl border border-border bg-secondary/30 p-6 shadow-2xl shadow-primary/10">
              {/* Header bar */}
              <div className="mb-4 flex items-center gap-2">
                <div className="size-3 rounded-full bg-destructive/60" />
                <div className="size-3 rounded-full bg-yellow-500/60" />
                <div className="size-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-xs text-muted-foreground">
                  Sea Wolf Solver
                </span>
              </div>

              {/* Mock solver UI */}
              <div className="space-y-4">
                {/* Input section */}
                <div className="rounded-lg bg-background/50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Monitor className="size-4 text-primary" />
                    Microbe Input
                  </div>
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className="flex h-8 items-center justify-center rounded bg-secondary text-xs text-muted-foreground"
                      >
                        M{i + 1}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Results section */}
                <div className="rounded-lg bg-primary/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Play className="size-4" />
                    Optimal Selection
                  </div>
                  <div className="mt-3 flex gap-2">
                    {["M2", "M5", "M8"].map((m) => (
                      <div
                        key={m}
                        className="flex h-10 flex-1 items-center justify-center rounded bg-primary text-sm font-semibold text-primary-foreground"
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-center text-xs text-primary">
                    Score: 100 / 100
                  </p>
                </div>

                {/* Excel indicator */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileSpreadsheet className="size-4" />
                  Also available as Excel download
                </div>
              </div>
            </div>

            {/* Decorative glow */}
            <div className="pointer-events-none absolute -inset-4 -z-10 rounded-2xl bg-primary/5 blur-xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
