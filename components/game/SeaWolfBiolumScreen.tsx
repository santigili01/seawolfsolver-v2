import type { ReactNode } from "react"

const SEA_WOLF_BIOLUM_BG = "/sea-wolf-biolum-background.png"

/**
 * Opacity of the bioluminescence **image only** (0 = hidden, 1 = solid). Applies to every Sea Wolf
 * simulator route that uses `SeaWolfBiolumScreen` (full game, treatment, free demo).
 *
 * Tweak here — this is the single parameter for all simulators and phases.
 */
export const SEA_WOLF_BIOLUM_IMAGE_OPACITY = 0.2

/**
 * Stacking (bottom → top): teal session gradient → biolum art (`SEA_WOLF_BIOLUM_IMAGE_OPACITY`) → children.
 * Simulator roots should use `bg-transparent` so they do not paint over the biolum layer.
 */
export function SeaWolfBiolumScreen({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-dvh w-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-[#4ECDC4] via-[#3EBDB5] to-[#2BA8A0]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${SEA_WOLF_BIOLUM_BG})`,
          opacity: SEA_WOLF_BIOLUM_IMAGE_OPACITY,
        }}
      />
      <div className="relative z-[2] min-h-dvh w-full">{children}</div>
    </div>
  )
}
