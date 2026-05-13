"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function BottomCTA() {
  return (
    <section className="relative z-0 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="mt-0 mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Your interview is closer than you think.
        </h2>
        <p className="mb-12 text-lg text-muted-foreground">Join the first 50 buyers at launch pricing.</p>
        <div className="flex flex-col items-center gap-4">
          <Button size="lg" asChild className="w-full max-w-md bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto sm:min-w-[280px]">
            <Link href="#pricing">Get Your Best Score — $25</Link>
          </Button>
          <p className="flex max-w-md flex-wrap items-center justify-center gap-x-1 text-sm text-muted-foreground">
            <span className="whitespace-nowrap">Not ready? → Try the</span>
            <Link href="/sea-wolf-demo" className="whitespace-nowrap font-medium text-primary hover:underline">
              free demo
            </Link>
            <span className="whitespace-nowrap">first</span>
          </p>
        </div>
      </div>
    </section>
  )
}
