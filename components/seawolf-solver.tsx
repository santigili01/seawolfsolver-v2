"use client"

import { KeyboardEvent, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { FileSpreadsheet, BookOpen, FileText, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

type NumericInputValue = "" | number

type MicrobeData = {
  mobility: NumericInputValue[]
  agility: NumericInputValue[]
  size: NumericInputValue[]
  desirable: boolean[]
  undesirable: boolean[]
}

type TargetRanges = {
  mobility: { min: NumericInputValue; max: NumericInputValue }
  agility: { min: NumericInputValue; max: NumericInputValue }
  size: { min: NumericInputValue; max: NumericInputValue }
}

type ComboEvaluation = {
  microbes: [number, number, number]
  score: number
  means: {
    mobility: number
    agility: number
    size: number
  }
  checks: {
    mobilityInRange: boolean
    agilityInRange: boolean
    sizeInRange: boolean
    desiredPresent: boolean
    undesiredAbsent: boolean
  }
}

const MICROBE_COUNT = 10
const DEFAULT_ATTRIBUTE_NAMES = ["Attribute 1", "Attribute 2", "Attribute 3"] as const
const ATTRIBUTE_KEYS = ["mobility", "agility", "size"] as const
const MICROBE_TABLES = [
  { start: 0, end: 4, bgClass: "bg-[#f0f4ff]", borderClass: "border-l-[#2563eb]/50" },
  { start: 5, end: 9, bgClass: "bg-[#f0f4ff]", borderClass: "border-l-[#2563eb]/50" },
] as const

export function SeawolfSolver() {
  const [attributeNames, setAttributeNames] = useState<string[]>([...DEFAULT_ATTRIBUTE_NAMES])
  const [editingAttribute, setEditingAttribute] = useState<{
    index: number
    tableStart: number
  } | null>(null)
  const [attributeDraftName, setAttributeDraftName] = useState("")
  const [showAllOptimalCombos, setShowAllOptimalCombos] = useState(false)

  const [targetRanges, setTargetRanges] = useState<TargetRanges>({
    mobility: { min: "", max: "" },
    agility: { min: "", max: "" },
    size: { min: "", max: "" },
  })

  const [microbeData, setMicrobeData] = useState<MicrobeData>({
    mobility: Array(MICROBE_COUNT).fill(""),
    agility: Array(MICROBE_COUNT).fill(""),
    size: Array(MICROBE_COUNT).fill(""),
    desirable: Array(MICROBE_COUNT).fill(false),
    undesirable: Array(MICROBE_COUNT).fill(false),
  })

  const parseNumericInput = (value: string): NumericInputValue => {
    const parsed = parseInt(value, 10)
    if (Number.isNaN(parsed)) return ""
    return Math.max(1, Math.min(10, parsed))
  }

  const handleRangeChange = (
    attribute: keyof TargetRanges,
    field: "min" | "max",
    value: string
  ) => {
    const numValue = parseNumericInput(value)
    setTargetRanges((prev) => ({
      ...prev,
      [attribute]: {
        ...prev[attribute],
        [field]: numValue,
      },
    }))
  }

  const handleMicrobeValueChange = (
    attribute: keyof Omit<MicrobeData, "desirable" | "undesirable">,
    index: number,
    value: string
  ) => {
    const numValue = parseNumericInput(value)
    setMicrobeData((prev) => ({
      ...prev,
      [attribute]: prev[attribute].map((v, i) => (i === index ? numValue : v)),
    }))
  }

  const handleCheckboxChange = (
    type: "desirable" | "undesirable",
    index: number,
    checked: boolean
  ) => {
    setMicrobeData((prev) => ({
      ...prev,
      [type]: prev[type].map((v, i) => (i === index ? checked : v)),
    }))
  }

  const handleMicrobeInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    microbeIndex: number,
    attributeIndex: number
  ) => {
    if (event.key !== "Enter") return
    event.preventDefault()

    let nextMicrobeIndex = microbeIndex
    let nextAttributeIndex = attributeIndex + 1

    if (nextAttributeIndex > 2) {
      nextAttributeIndex = 0
      nextMicrobeIndex = microbeIndex === MICROBE_COUNT - 1 ? 0 : microbeIndex + 1
    }

    const nextInput = document.querySelector<HTMLInputElement>(
      `input[data-microbe-index="${nextMicrobeIndex}"][data-attribute-index="${nextAttributeIndex}"]`
    )
    nextInput?.focus()
    nextInput?.select()
  }

  const clearAllInputs = () => {
    setTargetRanges({
      mobility: { min: "", max: "" },
      agility: { min: "", max: "" },
      size: { min: "", max: "" },
    })
    setMicrobeData({
      mobility: Array(MICROBE_COUNT).fill(""),
      agility: Array(MICROBE_COUNT).fill(""),
      size: Array(MICROBE_COUNT).fill(""),
      desirable: Array(MICROBE_COUNT).fill(false),
      undesirable: Array(MICROBE_COUNT).fill(false),
    })
  }

  const randomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min

  const fillRandomInputs = () => {
    const randomRange = () => {
      const min = randomInt(1, 7)
      const maxDelta = Math.min(4, 10 - min)
      const delta = randomInt(2, maxDelta)
      return { min, max: min + delta }
    }

    setTargetRanges({
      mobility: randomRange(),
      agility: randomRange(),
      size: randomRange(),
    })

    setMicrobeData({
      mobility: Array.from({ length: MICROBE_COUNT }, () => randomInt(1, 10)),
      agility: Array.from({ length: MICROBE_COUNT }, () => randomInt(1, 10)),
      size: Array.from({ length: MICROBE_COUNT }, () => randomInt(1, 10)),
      desirable: Array.from({ length: MICROBE_COUNT }, () => Math.random() < 0.25),
      undesirable: Array.from({ length: MICROBE_COUNT }, () => Math.random() < 0.15),
    })
  }

  useEffect(() => {
    const handleGlobalShortcut = (event: globalThis.KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "r") {
        event.preventDefault()
        clearAllInputs()
        return
      }
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault()
        fillRandomInputs()
      }
    }

    window.addEventListener("keydown", handleGlobalShortcut)
    return () => window.removeEventListener("keydown", handleGlobalShortcut)
  }, [])

  const startEditingAttribute = (index: number, tableStart: number) => {
    setEditingAttribute({ index, tableStart })
    setAttributeDraftName(attributeNames[index])
  }

  const saveAttributeName = () => {
    if (!editingAttribute) return
    const nextName = attributeDraftName.trim() || DEFAULT_ATTRIBUTE_NAMES[editingAttribute.index]
    setAttributeNames((prev) =>
      prev.map((name, idx) => (idx === editingAttribute.index ? nextName : name))
    )
    setEditingAttribute(null)
    setAttributeDraftName("")
  }

  const areRangeInputsComplete = useMemo(
    () => Object.values(targetRanges).every((range) => range.min !== "" && range.max !== ""),
    [targetRanges]
  )

  const areMicrobeInputsComplete = useMemo(
    () =>
      microbeData.mobility.every((value) => value !== "") &&
      microbeData.agility.every((value) => value !== "") &&
      microbeData.size.every((value) => value !== ""),
    [microbeData]
  )

  const areAllInputsComplete = areRangeInputsComplete && areMicrobeInputsComplete

  const numericTargetRanges = useMemo(
    () => ({
      mobility: {
        min: Number(targetRanges.mobility.min),
        max: Number(targetRanges.mobility.max),
      },
      agility: {
        min: Number(targetRanges.agility.min),
        max: Number(targetRanges.agility.max),
      },
      size: {
        min: Number(targetRanges.size.min),
        max: Number(targetRanges.size.max),
      },
    }),
    [targetRanges]
  )

  const evaluations = useMemo<ComboEvaluation[]>(() => {
    if (!areAllInputsComplete) return []

    const mobility = microbeData.mobility.map(Number)
    const agility = microbeData.agility.map(Number)
    const size = microbeData.size.map(Number)
    const combos: ComboEvaluation[] = []

    for (let i = 0; i < MICROBE_COUNT; i++) {
      for (let j = i + 1; j < MICROBE_COUNT; j++) {
        for (let k = j + 1; k < MICROBE_COUNT; k++) {
          const microbes: [number, number, number] = [i, j, k]
          const means = {
            mobility: (mobility[i] + mobility[j] + mobility[k]) / 3,
            agility: (agility[i] + agility[j] + agility[k]) / 3,
            size: (size[i] + size[j] + size[k]) / 3,
          }

          const checks = {
            mobilityInRange:
              means.mobility >= numericTargetRanges.mobility.min &&
              means.mobility <= numericTargetRanges.mobility.max,
            agilityInRange:
              means.agility >= numericTargetRanges.agility.min &&
              means.agility <= numericTargetRanges.agility.max,
            sizeInRange:
              means.size >= numericTargetRanges.size.min && means.size <= numericTargetRanges.size.max,
            desiredPresent: microbes.some((idx) => microbeData.desirable[idx]),
            undesiredAbsent: microbes.every((idx) => !microbeData.undesirable[idx]),
          }

          let score = 100
          if (!checks.mobilityInRange) score -= 20
          if (!checks.agilityInRange) score -= 20
          if (!checks.sizeInRange) score -= 20
          if (!checks.desiredPresent) score -= 20
          if (!checks.undesiredAbsent) score -= 20

          combos.push({
            microbes,
            score: Math.max(0, score),
            means,
            checks,
          })
        }
      }
    }

    return combos
  }, [areAllInputsComplete, microbeData, numericTargetRanges])

  const maxScore = useMemo(
    () => evaluations.reduce((best, combo) => Math.max(best, combo.score), 0),
    [evaluations]
  )

  const winningCombos = useMemo(
    () => evaluations.filter((combo) => combo.score === maxScore),
    [evaluations, maxScore]
  )
  const primaryWinningCombo = winningCombos[0] ?? null
  const shouldHighlightWinningMicrobes = areAllInputsComplete && maxScore > 0 && !!primaryWinningCombo
  const highlightedColumns = useMemo(
    () =>
      shouldHighlightWinningMicrobes && primaryWinningCombo
        ? new Set(primaryWinningCombo.microbes)
        : new Set<number>(),
    [primaryWinningCombo, shouldHighlightWinningMicrobes]
  )

  const maxScoreClass =
    maxScore === 100 ? "text-[#16a34a]" : maxScore === 80 ? "text-[#d97706]" : "text-[#dc2626]"

  return (
    <div className="flex-1 p-3 md:p-4 overflow-auto text-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-card border border-border">
            <FileText className="w-3.5 h-3.5 text-foreground" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://seawolfsolver.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            SeaWolfSolver.com
          </a>
          <button className="p-1.5 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 p-2.5 mb-2 rounded-lg bg-[#1e293b] border border-[#334155] shadow-sm">
        <div className="flex items-center gap-2 text-blue-300">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span className="text-xs text-slate-100">Prefer Excel? Download the spreadsheet solver instead.</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs bg-[#2563eb] text-white border-[#2563eb] hover:bg-[#1d4ed8]">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel Solver
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs bg-transparent text-slate-100 border-slate-500 hover:bg-slate-700">
            <BookOpen className="w-3.5 h-3.5" />
            Usage Guide
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-2">
        <h1 className="text-lg md:text-xl font-bold text-foreground mb-1">
          McKinsey Sea Wolf Solver
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter target ranges and microbe data to instantly evaluate all 120 combinations.
        </p>
      </div>

      <div className="mb-3">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr_2.75fr] gap-2.5 items-stretch">
          <div className="h-full rounded-lg bg-card border border-[#d1d5db] shadow-sm p-3 flex flex-col justify-center items-center">
            <h2 className="text-[1.1rem] font-semibold text-foreground mb-2">Target Ranges</h2>
            <div className="space-y-2">
              {attributeNames.map((attr, idx) => {
                const key = ATTRIBUTE_KEYS[idx]
                return (
                  <div key={attr} className="flex items-center gap-2">
                    <span className="w-24 text-base font-medium text-[#374151]">
                      {attr}
                    </span>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={targetRanges[key].min}
                      onChange={(e) => handleRangeChange(key, "min", e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-14 h-9 text-base font-medium text-center bg-white border-2 border-[#94a3b8] rounded-md text-[#111827] px-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)] focus-visible:ring-0 focus-visible:border-[#2563eb]"
                    />
                    <span className="text-xs text-muted-foreground">-</span>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={targetRanges[key].max}
                      onChange={(e) => handleRangeChange(key, "max", e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-14 h-9 text-base font-medium text-center bg-white border-2 border-[#94a3b8] rounded-md text-[#111827] px-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)] focus-visible:ring-0 focus-visible:border-[#2563eb]"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="h-full rounded-lg bg-card border border-[#d1d5db] shadow-sm p-3 flex flex-col">
            <h2 className="text-[1.1rem] font-semibold text-foreground mb-2">Results</h2>
            {areAllInputsComplete && primaryWinningCombo ? (
              <div className="flex-1 flex flex-col justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Max Score</p>
                  <p className={cn("text-5xl leading-none font-bold", maxScoreClass)}>{maxScore}</p>
                </div>
                {maxScore > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {primaryWinningCombo.microbes.map((microbeIdx) => (
                        <span
                          key={microbeIdx}
                        className="px-2 py-0.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground"
                        >
                          M{microbeIdx + 1}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {winningCombos.length} {winningCombos.length === 1 ? "combination achieves" : "combinations achieve"} this score out of 120
                    </p>
                    <button
                      type="button"
                      className="text-[11px] text-primary hover:underline"
                      onClick={() => setShowAllOptimalCombos((prev) => !prev)}
                    >
                      {showAllOptimalCombos ? "Hide all optimal combinations" : "All optimal combinations"}
                    </button>
                    {showAllOptimalCombos && (
                      <div className="space-y-1 max-h-24 overflow-auto pr-1">
                        {winningCombos.map((combo) => (
                          <div key={combo.microbes.join("-")} className="flex items-center gap-1 flex-wrap">
                            {combo.microbes.map((microbeIdx) => (
                              <span
                                key={`${combo.microbes.join("-")}-${microbeIdx}`}
                                className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-secondary text-foreground"
                              >
                                M{microbeIdx + 1}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    {maxScore < 100 && (
                      <p className="text-[11px] italic text-muted-foreground">
                        Perfect scores are not always achievable. This is the best possible result
                        with the current pool - double-check your inputs if this seems unexpected.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[15px] text-muted-foreground">No winning combo.</p>
                )}
              </div>
            ) : (
              <p className="text-[15px] leading-tight text-muted-foreground">
                Fill in all microbe values and target ranges to see results
              </p>
            )}
          </div>

          <div className="h-full rounded-lg bg-card border border-[#d1d5db] shadow-sm p-3 flex flex-col justify-center">
            <h2 className="text-[1.1rem] font-semibold text-foreground mb-1.5">Conditions</h2>
            {areAllInputsComplete && primaryWinningCombo ? (
              <ul className="space-y-1.5">
                {[
                  {
                    label: `🏃 ${attributeNames[0]} mean in range`,
                    mean: primaryWinningCombo.means.mobility.toFixed(2),
                    passed: primaryWinningCombo.checks.mobilityInRange,
                  },
                  {
                    label: `⚡ ${attributeNames[1]} mean in range`,
                    mean: primaryWinningCombo.means.agility.toFixed(2),
                    passed: primaryWinningCombo.checks.agilityInRange,
                  },
                  {
                    label: `📏 ${attributeNames[2]} mean in range`,
                    mean: primaryWinningCombo.means.size.toFixed(2),
                    passed: primaryWinningCombo.checks.sizeInRange,
                  },
                  {
                    label: "✅ Desired trait present",
                    mean: null,
                    passed: primaryWinningCombo.checks.desiredPresent,
                  },
                  {
                    label: "❌ Undesired trait absent",
                    mean: null,
                    passed: primaryWinningCombo.checks.undesiredAbsent,
                  },
                ].map((check) => (
                  <li key={check.label} className="flex items-center justify-between min-h-6">
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <span className={cn("text-[11px] truncate", check.passed ? "text-foreground" : "text-muted-foreground")}>
                        {check.label}
                      </span>
                      {check.mean ? <span className="text-[11px] text-muted-foreground">—</span> : null}
                      {check.mean ? <span className="text-[11px] font-bold text-[#111827]">{check.mean}</span> : null}
                    </div>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 text-white",
                        check.passed ? "bg-[#16a34a]" : "bg-[#dc2626]"
                      )}
                    >
                      {check.passed ? "PASS" : "FAIL"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[15px] leading-tight text-muted-foreground">
                Fill in all microbe values and target ranges to see results
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Microbe Data */}
      <div className="p-2.5 md:p-3 mb-3 rounded-lg bg-card border border-[#d1d5db] shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[1.1rem] font-semibold text-foreground">Microbe Data</h2>
          <div className="flex items-start gap-2">
            <div className="text-right">
              <Button
                variant="outline"
                size="sm"
                className="h-10 px-4 text-sm border-[#2563eb] text-[#2563eb] bg-white hover:bg-[#2563eb] hover:text-white"
                onClick={fillRandomInputs}
              >
                Random Input
              </Button>
              <p className="mt-1 text-[10px] text-muted-foreground">Ctrl+Shift+F</p>
            </div>
            <div className="text-right">
              <Button
                variant="outline"
                size="sm"
                className="h-10 px-4 text-sm border-[#dc2626] text-[#dc2626] bg-white hover:bg-[#dc2626] hover:text-white"
                onClick={clearAllInputs}
              >
                Clear All
              </Button>
              <p className="mt-1 text-[10px] text-muted-foreground">Ctrl+Shift+R</p>
            </div>
          </div>
        </div>
        <div className="space-y-2.5">
          {MICROBE_TABLES.map((table) => {
            const microbeIndices = Array.from(
              { length: table.end - table.start + 1 },
              (_, idx) => table.start + idx
            )

            return (
              <div
                key={table.start}
                className={cn(
                  "rounded-md border border-[#cbd5e1] border-l-2 p-2 overflow-x-auto shadow-inner",
                  table.bgClass,
                  table.borderClass
                )}
              >
                <table className="w-full table-fixed border-separate border-spacing-y-1 border-spacing-x-2">
                  <thead>
                    <tr>
                      <th className="w-22 text-left text-xs font-bold text-foreground px-1.5 py-1 bg-[#f1f5f9] rounded-md">
                        Microbe
                      </th>
                      {microbeIndices.map((microbeIdx) => (
                        <th
                          key={microbeIdx}
                          className={cn(
                            "text-center text-xs font-bold text-[#1e293b] px-4 py-1 bg-[#e2e8f0] rounded-t-md border border-[#cbd5e1] border-b-0 shadow-sm",
                            highlightedColumns.has(microbeIdx) && "bg-[#dcfce7] border-[#16a34a]"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex min-w-8 justify-center px-1.5 py-0.5 rounded text-[10px] font-semibold",
                              table.start === 0
                                ? "bg-[#2563eb] text-white"
                                : "bg-[#6366f1] text-white",
                              highlightedColumns.has(microbeIdx) && "bg-[#16a34a] text-white"
                            )}
                          >
                            M{microbeIdx + 1}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attributeNames.map((attr, attrIndex) => {
                      const key = ATTRIBUTE_KEYS[attrIndex]
                      return (
                        <tr key={attr}>
                          <td className="text-[11px] font-semibold text-[#374151] px-1.5 py-0.5 align-middle whitespace-nowrap">
                            {editingAttribute?.index === attrIndex &&
                            editingAttribute.tableStart === table.start ? (
                              <Input
                                value={attributeDraftName}
                                onChange={(e) => setAttributeDraftName(e.target.value)}
                                onBlur={saveAttributeName}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault()
                                    saveAttributeName()
                                  }
                                }}
                                autoFocus
                                className="h-7 text-[11px] px-1"
                              />
                            ) : (
                              <span
                                className="cursor-text inline-flex items-center gap-1"
                                onDoubleClick={() => startEditingAttribute(attrIndex, table.start)}
                                title="Double-click to rename"
                              >
                                {attr}
                                <button
                                  type="button"
                                  className="text-[#718096] opacity-[0.35] hover:opacity-[0.7] transition-opacity"
                                  onClick={() => startEditingAttribute(attrIndex, table.start)}
                                  aria-label={`Edit ${attr}`}
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              </span>
                            )}
                          </td>
                          {microbeIndices.map((microbeIdx) => (
                            <td
                              key={`${attr}-${microbeIdx}`}
                              className={cn(
                                "px-4 py-0.5 border-x border-[#cbd5e1]",
                                attrIndex % 2 === 0 ? "bg-white" : "bg-[#f1f5f9]",
                                highlightedColumns.has(microbeIdx) &&
                                  "bg-[#dcfce7] border-[#16a34a]"
                              )}
                            >
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                value={microbeData[key][microbeIdx]}
                                onChange={(e) => handleMicrobeValueChange(key, microbeIdx, e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => handleMicrobeInputKeyDown(e, microbeIdx, attrIndex)}
                                data-microbe-index={microbeIdx}
                                data-attribute-index={attrIndex}
                                className="h-7 text-[11px] font-medium text-center bg-white border-2 border-[#94a3b8] rounded-md text-[#111827] px-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)] focus-visible:ring-0 focus-visible:border-[#2563eb]"
                              />
                            </td>
                          ))}
                        </tr>
                      )
                    })}

                    <tr>
                      <td className="text-[10px] font-semibold text-[#374151] px-1.5 py-0.5 align-middle whitespace-nowrap bg-[#f1f5f9]">
                        Desirable Trait
                      </td>
                      {microbeIndices.map((microbeIdx) => (
                        <td
                          key={`desirable-${microbeIdx}`}
                          className={cn(
                            "px-4 py-0.5 bg-[#f1f5f9] border-x border-[#cbd5e1]",
                            highlightedColumns.has(microbeIdx) &&
                              "bg-[#dcfce7] border-[#16a34a]"
                          )}
                        >
                          <div className="h-7 flex items-center justify-center rounded-md border border-border bg-background">
                            <Checkbox
                              checked={microbeData.desirable[microbeIdx]}
                              onCheckedChange={(c) => handleCheckboxChange("desirable", microbeIdx, c === true)}
                              className="border-primary data-[state=checked]:bg-primary"
                            />
                          </div>
                        </td>
                      ))}
                    </tr>

                    <tr>
                      <td className="text-[10px] font-semibold text-[#374151] px-1.5 py-0.5 align-middle whitespace-nowrap bg-white">
                        Undesirable Trait
                      </td>
                      {microbeIndices.map((microbeIdx) => (
                        <td
                          key={`undesirable-${microbeIdx}`}
                          className={cn(
                            "px-4 py-0.5 bg-white border-x border-b border-[#cbd5e1] rounded-b-md shadow-sm",
                            highlightedColumns.has(microbeIdx) &&
                              "bg-[#dcfce7] border-[#16a34a]"
                          )}
                        >
                          <div className="h-7 flex items-center justify-center rounded-md border border-border bg-background">
                            <Checkbox
                              checked={microbeData.undesirable[microbeIdx]}
                              onCheckedChange={(c) => handleCheckboxChange("undesirable", microbeIdx, c === true)}
                              className="border-primary data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
