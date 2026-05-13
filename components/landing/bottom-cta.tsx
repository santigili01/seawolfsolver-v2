"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function BottomCTA() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="mt-0 mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Ready to walk in prepared?
        </h2>
        <p className="mb-12 text-lg text-muted-foreground">Join the first 50 buyers at launch pricing.</p>
        <div className="flex flex-col items-center gap-4">
          <Button size="lg" asChild className="w-full max-w-md bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto sm:min-w-[280px]">
            <Link href="#pricing">Get Your Best Score — $25</Link>
          </Button>
          <p className="max-w-md text-sm text-muted-foreground">
            Not ready? Try the free demo first — no signup, full insights included.{" "}
            <Link href="/sea-wolf-demo" className="font-medium text-primary hover:underline">
              → Try Free Demo
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
