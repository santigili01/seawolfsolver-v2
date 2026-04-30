import Link from "next/link";
import { Check, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const includes = [
  "Web-based solver",
  "Excel solver with formula engine",
  "Free practice simulator",
  "All future updates",
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto max-w-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple, One-Time Pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No subscriptions. No hidden fees. Pay once, use forever.
          </p>
        </div>

        {/* Pricing card */}
        <div className="relative mt-12">
          {/* Glow effect */}
          <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-primary/10 blur-lg" />

          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card p-8 shadow-xl">
            {/* Label */}
            <div className="absolute right-4 top-4">
              <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
                One-Time Payment
              </span>
            </div>

            {/* Price */}
            <div className="mt-4 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold tracking-tight text-foreground">
                  $19
                </span>
              </div>
              <p className="mt-2 text-muted-foreground">
                Lifetime access · No subscription · Instant delivery
              </p>
            </div>

            {/* Features */}
            <ul className="mt-8 space-y-3">
              {includes.map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <Check className="size-3 text-primary" />
                  </div>
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Button className="mt-8 w-full" size="lg" asChild>
              <Link href="#">Get Instant Access — $19</Link>
            </Button>

            {/* Trust indicators */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Lock className="size-3.5" />
                <span>SSL Secured</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" />
                <span>256-bit Encryption</span>
              </div>
              <div className="flex items-center gap-1.5">
                <RefreshCw className="size-3.5" />
                <span>30-Day Money-Back</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
