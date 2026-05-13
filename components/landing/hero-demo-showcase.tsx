"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type TabId = "solver" | "simulator" | "insights"

const TABS: { id: TabId; label: string }[] = [
  { id: "solver", label: "Solver" },
  { id: "simulator", label: "Sea Wolf Simulator" },
  { id: "insights", label: "Insights" },
]

const CAPTIONS: Record<TabId, string> = {
  solver:
    "Get the optimal solution instantly. Don't waste time, maximize your score.",
  simulator: "Built to mimic the real McKinsey interface. Walk in prepared.",
  insights:
    "Deep insights after every run. Know exactly where and why you failed. Learn to fix it.",
}

const MEDIA: Record<"solver" | "simulator", { video: string }> = {
  solver: { video: "/demo-content/sea-wolf-solver-demo-video.mp4" },
  simulator: { video: "/demo-content/sea-wolf-demo-video.mp4" },
}

const INSIGHT_SLIDES = [
  "/demo-content/Insights-demo-screenshot-1.png",
  "/demo-content/Insights-demo-screenshot-2.png",
  "/demo-content/Insights-demo-screenshot-3.png",
  "/demo-content/Insights-demo-screenshot-4.png",
] as const

const INSIGHT_SLIDE_MS = 4000

function DemoVideo({ src, className }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(false)

  const onError = useCallback(() => {
    setFailed(true)
  }, [])

  if (failed) {
    return (
      <div
        className={cn("absolute inset-0 bg-gray-100", className)}
        aria-hidden
      />
    )
  }

  return (
    <video
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
      src={src}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      onError={onError}
    />
  )
}

function InsightsSlideshow({ className }: { className?: string }) {
  const [index, setIndex] = useState(0)
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % INSIGHT_SLIDES.length)
    }, INSIGHT_SLIDE_MS)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    setBroken(false)
  }, [index])

  if (broken) {
    return (
      <div
        className={cn("absolute inset-0 bg-gray-100", className)}
        aria-hidden
      />
    )
  }

  const src = INSIGHT_SLIDES[index]

  return (
    <div className={cn("absolute inset-0 bg-gray-100", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static public slides */}
      <img
        key={src}
        src={src}
        alt=""
        className="h-full w-full object-contain object-center"
        onError={() => setBroken(true)}
      />
    </div>
  )
}

export function HeroDemoShowcase() {
  const [tab, setTab] = useState<TabId>("solver")

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h2 className="mt-0 mb-5 text-center text-2xl font-bold tracking-tight text-foreground sm:mb-6 sm:text-3xl">
        See it in action
      </h2>

      <div className="mx-auto w-[min(100%,79.475%)] max-w-full">
        <div className="rounded-xl border border-border bg-white p-3 shadow-sm sm:p-4 dark:bg-card">
          <div
            className="flex gap-1 rounded-lg bg-muted/60 p-1 sm:gap-2"
            role="tablist"
            aria-label="Demo type"
          >
            {TABS.map(({ id, label }) => {
              const active = tab === id
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(id)}
                  className={cn(
                    "min-h-9 flex-1 rounded-md px-2 py-1.5 text-center text-xs font-semibold transition-colors sm:min-h-10 sm:px-3 sm:py-2 sm:text-sm",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
            {tab === "solver" ? <DemoVideo key="solver" src={MEDIA.solver.video} /> : null}
            {tab === "simulator" ? (
              <DemoVideo key="simulator" src={MEDIA.simulator.video} />
            ) : null}
            {tab === "insights" ? <InsightsSlideshow /> : null}
          </div>
        </div>
      </div>

      <p className="mx-auto mt-2 max-w-3xl text-pretty text-center text-sm leading-relaxed text-white sm:mt-3 sm:text-[0.9375rem]">
        {CAPTIONS[tab]}
      </p>
    </div>
  )
}
