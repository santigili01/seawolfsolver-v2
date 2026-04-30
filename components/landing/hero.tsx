import Link from "next/link";
import { CreditCard, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
      {/* Subtle glow effect */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl text-center">
        {/* Category label */}
        <p className="text-sm font-medium tracking-wide text-muted-foreground">
          McKinsey Solve · Sea Wolf Practice Tool
        </p>

        {/* Badge */}
        <Badge
          variant="secondary"
          className="mt-4 px-4 py-1.5 text-sm font-medium"
        >
          Join 1,200+ candidates practicing
        </Badge>

        {/* Main headline */}
        <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Pass McKinsey Solve with Optimal Microbe
          Selections—Instantly
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
          The tool that calculates the best microbe combination for you. Input
          10 microbes, get the optimal selection in seconds. Save time,
          eliminate guesswork, rank higher.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button variant="outline" size="lg" asChild>
            <Link href="#simulator">Try Free Simulator</Link>
          </Button>
          <Button size="lg" asChild>
            <Link href="#pricing">Get the Solver</Link>
          </Button>
        </div>

        {/* Payment icons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <CreditCard className="size-4" />
            <span>Visa</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <CreditCard className="size-4" />
            <span>Mastercard</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <CreditCard className="size-4" />
            <span>PayPal</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <CreditCard className="size-4" />
            <span>Amex</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <CreditCard className="size-4" />
            <span>Apple Pay</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <CreditCard className="size-4" />
            <span>Google Pay</span>
          </div>
        </div>

        {/* Pricing note */}
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="size-4" />
          From $19 · One-time payment · Instant access
        </p>
      </div>
    </section>
  );
}
