"use client"

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react"

/**
 * Fits fixed-width game UI into a narrower container by scaling down uniformly
 * (transform) while preserving proportions. Uses a clip box so layout height matches
 * the scaled visual height.
 */
export function SimulatorScaleStage({
  designWidth,
  minScale,
  className = "",
  children,
}: {
  designWidth: number
  /** When set, scale never goes below this (can clip on very narrow widths). Omit for `min(1, width / designWidth)` only. */
  minScale?: number
  className?: string
  children: ReactNode
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [innerH, setInnerH] = useState(0)

  const recalc = useCallback(() => {
    const outer = outerRef.current
    const inner = measureRef.current
    if (!outer || !inner) return
    const cw = outer.clientWidth
    if (cw <= 0) return
    const raw = cw / designWidth
    const nextScale =
      minScale != null && Number.isFinite(minScale) ? Math.min(1, Math.max(minScale, raw)) : Math.min(1, raw)
    setScale(nextScale)
    setInnerH(inner.offsetHeight)
  }, [designWidth, minScale])

  useLayoutEffect(() => {
    const outer = outerRef.current
    if (!outer) return
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(recalc)
    })
    ro.observe(outer)
    recalc()
    return () => ro.disconnect()
  }, [recalc])

  useLayoutEffect(() => {
    const inner = measureRef.current
    if (!inner) return
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(recalc)
    })
    ro.observe(inner)
    return () => ro.disconnect()
  }, [recalc, children])

  const scaledW = designWidth * scale
  const scaledH = innerH > 0 ? innerH * scale : undefined

  return (
    <div ref={outerRef} className={`min-h-0 min-w-0 w-full ${className}`}>
      <div
        className="mx-auto overflow-hidden"
        style={{
          width: scaledW,
          height: scaledH,
          maxWidth: "100%",
        }}
      >
        <div
          ref={measureRef}
          style={{
            width: designWidth,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
