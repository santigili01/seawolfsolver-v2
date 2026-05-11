import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, Droplets, Flame, HelpCircle, Layers, LogOut, Settings, Shield, Star } from "lucide-react"
import {
  clampSliderStart,
  formatCountdown,
  traitChipBg,
  traitColor,
} from "@/lib/game-helpers"
import type { Microbe, ScenarioRequirements } from "@/lib/game-types"

export function traitIcon(trait: string, className = "h-4 w-4") {
  switch (trait) {
    case "Thermophilic":
      return <Flame className={className} />
    case "Metal-tolerant":
      return <Shield className={className} />
    case "Biofilm-forming":
      return <Layers className={className} />
    case "Halophobic":
      return <Droplets className={className} />
    default:
      return <Layers className={className} />
  }
}

export function microbeIdToSvgIndex(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0x7fffffff
  }
  return hash % microbeComponents.length
}

export function assignUniqueSvgIndices(microbes: { id: string }[]): Map<string, number> {
  const used = new Set<number>()
  const result = new Map<string, number>()
  for (const m of microbes) {
    let idx = microbeIdToSvgIndex(m.id)
    while (used.has(idx)) {
      idx = (idx + 1) % microbeComponents.length
    }
    used.add(idx)
    result.set(m.id, idx)
  }
  return result
}

export function MicrobeSvgFor(m: Microbe, pool: Microbe[]) {
  const svgMap = assignUniqueSvgIndices(pool)
  const idx = svgMap.get(m.id) ?? microbeIdToSvgIndex(m.id)
  const Svg = microbeComponents[idx % microbeComponents.length]!
  const c = MICROBE_PALETTE[idx % MICROBE_PALETTE.length] ?? "#888"
  return <Svg color={c} />
}

export function attributeKeyIcon(attribute: string) {
  switch (attribute) {
    case "Mobility":
      return (
        <svg className="h-4 w-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="1" width="4" height="4" />
          <rect x="6" y="1" width="4" height="4" />
          <rect x="11" y="1" width="4" height="4" />
          <rect x="1" y="6" width="4" height="4" />
          <rect x="6" y="6" width="4" height="4" />
        </svg>
      )
    case "Agility":
      return (
        <svg className="h-4 w-4 text-yellow-500" viewBox="0 0 16 16" fill="currentColor">
          <path d="M9 1L4 9h4l-1 6 5-8H8l1-6z" />
        </svg>
      )
    case "Size":
      return (
        <svg className="h-4 w-4 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1 15L1 1L15 15H1Z" opacity="0.6" />
        </svg>
      )
    default:
      return <span className="inline-block h-4 w-4 rounded-sm bg-gray-500" aria-hidden />
  }
}

export function attributeRowIcon(attribute: string) {
  switch (attribute) {
    case "Mobility":
      return (
        <svg className="h-5 w-5 shrink-0 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="1" width="4" height="4" />
          <rect x="6" y="1" width="4" height="4" />
          <rect x="11" y="1" width="4" height="4" />
          <rect x="1" y="6" width="4" height="4" />
          <rect x="6" y="6" width="4" height="4" />
          <rect x="11" y="6" width="4" height="4" />
          <rect x="1" y="11" width="4" height="4" />
          <rect x="6" y="11" width="4" height="4" />
          <rect x="11" y="11" width="4" height="4" />
        </svg>
      )
    case "Agility":
      return (
        <svg className="h-5 w-5 shrink-0 text-yellow-500" viewBox="0 0 16 16" fill="currentColor">
          <path d="M9 1L4 9h4l-1 6 5-8H8l1-6z" />
        </svg>
      )
    case "Size":
      return (
        <svg className="h-5 w-5 shrink-0 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1 15L1 1L15 15H1Z" opacity="0.6" />
          <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      )
    default:
      return <span className="inline-block h-5 w-5 shrink-0 rounded-sm bg-gray-400" aria-hidden />
  }
}

export function collapsedBlobCard(m: Microbe, poolMs: Microbe[]) {
  const svgMap = assignUniqueSvgIndices(poolMs)
  const bi = svgMap.get(m.id) ?? microbeIdToSvgIndex(m.id)
  const SvgC = microbeComponents[bi % microbeComponents.length] ?? MicrobeBlob1
  const c = MICROBE_PALETTE[bi % MICROBE_PALETTE.length] ?? "#808080"
  return <SvgC color={c} />
}

export const MICROBE_PALETTE = [
  "#FF6B6B",
  "#4ECDC4",
  "#FFE66D",
  "#95E1D3",
  "#F38181",
  "#AA96DA",
  "#FCBAD3",
  "#A8D8EA",
  "#C3EDC0",
  "#FFD93D",
  "#F5A97F",
  "#8BD3E6",
  "#B8F2A1",
  "#C6A0F6",
  "#F8C8DC",
  "#7DD3FC",
  "#86EFAC",
  "#FDBA74",
  "#FCA5A5",
  "#A7F3D0",
  "#93C5FD",
  "#DDD6FE",
  "#FDE68A",
  "#FBCFE8",
  "#67E8F9",
  "#BBF7D0",
  "#F9A8D4",
  "#C4B5FD",
  "#BAE6FD",
  "#D9F99D",
]

export const MicrobeBlob1 = ({ color = "#FF6B6B" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="40" rx="30" ry="25" fill={color} />
    <circle cx="30" cy="35" r="4" fill="white" opacity="0.6" />
    <path d="M15 40 Q5 35 8 25" stroke={color} strokeWidth="3" fill="none" />
    <path d="M65 40 Q75 35 72 25" stroke={color} strokeWidth="3" fill="none" />
  </svg>
)

export const MicrobeBlob2 = ({ color = "#4ECDC4" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path
      d="M40 10 Q70 20 65 50 Q60 75 40 70 Q20 75 15 50 Q10 20 40 10"
      fill={color}
    />
    <circle cx="35" cy="30" r="3" fill="white" opacity="0.5" />
    <path d="M40 70 L40 78" stroke={color} strokeWidth="2" />
    <path d="M35 68 L32 76" stroke={color} strokeWidth="2" />
    <path d="M45 68 L48 76" stroke={color} strokeWidth="2" />
  </svg>
)

export const MicrobeBlob3 = ({ color = "#FFE66D" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <circle cx="40" cy="40" r="20" fill={color} />
    <circle cx="25" cy="25" r="8" fill={color} />
    <circle cx="55" cy="25" r="6" fill={color} />
    <circle cx="55" cy="55" r="7" fill={color} />
    <circle cx="25" cy="55" r="5" fill={color} />
  </svg>
)

export const MicrobeBlob4 = ({ color = "#95E1D3" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="45" rx="25" ry="20" fill={color} />
    <path d="M20 30 Q15 15 25 10" stroke={color} strokeWidth="3" fill="none" />
    <path d="M60 30 Q65 15 55 10" stroke={color} strokeWidth="3" fill="none" />
    <circle cx="35" cy="40" r="3" fill="white" opacity="0.6" />
  </svg>
)

export const MicrobeBlob5 = ({ color = "#F38181" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 15 L55 30 L55 50 L40 65 L25 50 L25 30 Z" fill={color} />
    <circle cx="40" cy="40" r="8" fill="white" opacity="0.3" />
    <path d="M40 15 L40 5" stroke={color} strokeWidth="2" />
    <path d="M55 30 L65 25" stroke={color} strokeWidth="2" />
    <path d="M25 30 L15 25" stroke={color} strokeWidth="2" />
  </svg>
)

export const MicrobeBlob6 = ({ color = "#AA96DA" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="40" rx="28" ry="18" fill={color} />
    <path d="M12 40 Q5 40 8 50" stroke={color} strokeWidth="3" fill="none" />
    <path d="M68 40 Q75 40 72 50" stroke={color} strokeWidth="3" fill="none" />
    <circle cx="30" cy="38" r="4" fill="white" opacity="0.5" />
    <circle cx="50" cy="38" r="4" fill="white" opacity="0.5" />
  </svg>
)

export const MicrobeBlob7 = ({ color = "#FCBAD3" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <circle cx="40" cy="40" r="22" fill={color} />
    <circle cx="40" cy="40" r="12" fill="white" opacity="0.2" />
    <path d="M40 18 L40 8 M45 10 L40 8 L35 10" stroke={color} strokeWidth="2" fill="none" />
  </svg>
)

export const MicrobeBlob8 = ({ color = "#A8D8EA" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M25 40 Q25 20 40 20 Q55 20 55 40 Q55 60 40 60 Q25 60 25 40" fill={color} />
    <ellipse cx="40" cy="40" rx="8" ry="12" fill="white" opacity="0.3" />
    <circle cx="18" cy="35" r="5" fill={color} />
    <circle cx="62" cy="35" r="5" fill={color} />
  </svg>
)

export const MicrobeBlob9 = ({ color = "#C3EDC0" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="42" rx="22" ry="18" fill={color} />
    <path d="M30 24 Q28 12 35 8" stroke={color} strokeWidth="3" fill="none" />
    <path d="M50 24 Q52 12 45 8" stroke={color} strokeWidth="3" fill="none" />
    <path d="M40 60 L40 72" stroke={color} strokeWidth="3" fill="none" />
  </svg>
)

export const MicrobeBlob10 = ({ color = "#FFD93D" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <circle cx="40" cy="40" r="18" fill={color} />
    <circle cx="22" cy="30" r="6" fill={color} />
    <circle cx="58" cy="30" r="6" fill={color} />
    <circle cx="22" cy="50" r="6" fill={color} />
    <circle cx="58" cy="50" r="6" fill={color} />
    <circle cx="40" cy="40" r="6" fill="white" opacity="0.4" />
  </svg>
)

export const MicrobeBlob11 = ({ color = "#F5A97F" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <rect x="18" y="18" width="44" height="44" rx="14" fill={color} />
    <circle cx="32" cy="34" r="4" fill="white" opacity="0.45" />
    <path d="M18 40 L10 40" stroke={color} strokeWidth="3" />
    <path d="M62 40 L70 40" stroke={color} strokeWidth="3" />
  </svg>
)

export const MicrobeBlob12 = ({ color = "#8BD3E6" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 12 C58 12 66 24 66 40 C66 58 54 68 40 68 C24 68 14 56 14 40 C14 24 22 12 40 12Z" fill={color} />
    <ellipse cx="38" cy="32" rx="8" ry="5" fill="white" opacity="0.35" />
    <circle cx="24" cy="48" r="4" fill={color} />
    <circle cx="56" cy="48" r="4" fill={color} />
  </svg>
)

export const MicrobeBlob13 = ({ color = "#B8F2A1" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="40" rx="24" ry="22" fill={color} />
    <circle cx="29" cy="30" r="6" fill={color} />
    <circle cx="53" cy="30" r="5" fill={color} />
    <circle cx="40" cy="50" r="7" fill="white" opacity="0.22" />
  </svg>
)

export const MicrobeBlob14 = ({ color = "#C6A0F6" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 14 L58 24 L62 42 L50 58 L30 62 L18 46 L22 26 Z" fill={color} />
    <circle cx="37" cy="34" r="3" fill="white" opacity="0.55" />
    <path d="M22 26 L14 20" stroke={color} strokeWidth="2.5" />
    <path d="M58 24 L66 18" stroke={color} strokeWidth="2.5" />
  </svg>
)

export const MicrobeBlob15 = ({ color = "#F8C8DC" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="42" rx="26" ry="18" fill={color} />
    <circle cx="28" cy="42" r="3" fill="white" opacity="0.45" />
    <circle cx="52" cy="42" r="3" fill="white" opacity="0.45" />
    <path d="M14 42 Q8 38 10 32" stroke={color} strokeWidth="3" fill="none" />
    <path d="M66 42 Q72 38 70 32" stroke={color} strokeWidth="3" fill="none" />
  </svg>
)

export const MicrobeBlob16 = ({ color = "#7DD3FC" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <rect x="20" y="20" width="40" height="40" rx="20" fill={color} />
    <path d="M24 24 Q40 10 56 24" stroke={color} strokeWidth="3" fill="none" />
    <circle cx="35" cy="36" r="3" fill="white" opacity="0.5" />
    <circle cx="46" cy="44" r="5" fill="white" opacity="0.2" />
  </svg>
)

export const MicrobeBlob17 = ({ color = "#86EFAC" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 14 C55 16 64 28 62 44 C60 60 48 68 34 64 C20 60 14 44 20 30 C24 20 30 14 40 14Z" fill={color} />
    <circle cx="34" cy="32" r="4" fill="white" opacity="0.5" />
    <path d="M26 62 L22 72" stroke={color} strokeWidth="2" />
    <path d="M38 66 L38 76" stroke={color} strokeWidth="2" />
    <path d="M50 64 L54 74" stroke={color} strokeWidth="2" />
  </svg>
)

export const MicrobeBlob18 = ({ color = "#FDBA74" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 16 L54 24 L60 40 L54 56 L40 64 L26 56 L20 40 L26 24 Z" fill={color} />
    <circle cx="40" cy="40" r="9" fill="white" opacity="0.2" />
    <path d="M40 16 L40 8" stroke={color} strokeWidth="2" />
  </svg>
)

export const MicrobeBlob19 = ({ color = "#FCA5A5" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="40" rx="23" ry="21" fill={color} />
    <circle cx="28" cy="34" r="3" fill="white" opacity="0.5" />
    <path d="M22 26 L14 20" stroke={color} strokeWidth="2.5" />
    <path d="M58 26 L66 20" stroke={color} strokeWidth="2.5" />
    <path d="M24 54 L15 60" stroke={color} strokeWidth="2.5" />
    <path d="M56 54 L65 60" stroke={color} strokeWidth="2.5" />
  </svg>
)

export const MicrobeBlob20 = ({ color = "#A7F3D0" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M18 40 C18 24 30 14 42 16 C54 18 62 28 62 40 C62 54 54 64 40 64 C26 64 18 54 18 40Z" fill={color} />
    <ellipse cx="39" cy="31" rx="7" ry="4.5" fill="white" opacity="0.35" />
    <circle cx="22" cy="40" r="3.5" fill={color} />
    <circle cx="58" cy="40" r="3.5" fill={color} />
  </svg>
)

export const MicrobeBlob21 = ({ color = "#93C5FD" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <rect x="16" y="18" width="48" height="44" rx="18" fill={color} />
    <circle cx="30" cy="32" r="4" fill="white" opacity="0.45" />
    <path d="M24 18 L20 8" stroke={color} strokeWidth="2.5" />
    <path d="M56 18 L60 8" stroke={color} strokeWidth="2.5" />
  </svg>
)

export const MicrobeBlob22 = ({ color = "#DDD6FE" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="42" rx="25" ry="16" fill={color} />
    <ellipse cx="40" cy="42" rx="10" ry="6" fill="white" opacity="0.25" />
    <path d="M16 42 Q8 42 10 50" stroke={color} strokeWidth="3" fill="none" />
    <path d="M64 42 Q72 42 70 50" stroke={color} strokeWidth="3" fill="none" />
  </svg>
)

export const MicrobeBlob23 = ({ color = "#FDE68A" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 14 C50 14 60 22 62 34 C64 50 54 64 40 66 C26 64 16 50 18 34 C20 22 30 14 40 14Z" fill={color} />
    <circle cx="34" cy="32" r="3" fill="white" opacity="0.5" />
    <circle cx="46" cy="48" r="6" fill="white" opacity="0.2" />
  </svg>
)

export const MicrobeBlob24 = ({ color = "#FBCFE8" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 12 L52 18 L60 30 L58 46 L48 58 L32 62 L20 52 L16 36 L24 22 Z" fill={color} />
    <circle cx="36" cy="34" r="4" fill="white" opacity="0.45" />
    <path d="M40 12 L40 4" stroke={color} strokeWidth="2.5" />
    <path d="M24 22 L16 16" stroke={color} strokeWidth="2.5" />
  </svg>
)

export const MicrobeBlob25 = ({ color = "#67E8F9" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="40" rx="22" ry="24" fill={color} />
    <ellipse cx="36" cy="30" rx="6" ry="4" fill="white" opacity="0.35" />
    <path d="M26 62 L22 72" stroke={color} strokeWidth="2.2" />
    <path d="M40 64 L40 74" stroke={color} strokeWidth="2.2" />
    <path d="M54 62 L58 72" stroke={color} strokeWidth="2.2" />
  </svg>
)

export const MicrobeBlob26 = ({ color = "#BBF7D0" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <rect x="18" y="20" width="44" height="40" rx="12" fill={color} />
    <circle cx="30" cy="34" r="3" fill="white" opacity="0.5" />
    <circle cx="50" cy="46" r="5" fill="white" opacity="0.2" />
    <path d="M18 40 L10 36" stroke={color} strokeWidth="2.5" />
    <path d="M62 40 L70 36" stroke={color} strokeWidth="2.5" />
  </svg>
)

export const MicrobeBlob27 = ({ color = "#F9A8D4" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="40" rx="24" ry="19" fill={color} />
    <path d="M20 32 Q14 20 24 14" stroke={color} strokeWidth="3" fill="none" />
    <path d="M60 32 Q66 20 56 14" stroke={color} strokeWidth="3" fill="none" />
    <circle cx="33" cy="36" r="3.5" fill="white" opacity="0.45" />
  </svg>
)

export const MicrobeBlob28 = ({ color = "#C4B5FD" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 18 C56 18 64 30 62 44 C60 58 50 66 40 66 C28 66 18 56 18 44 C18 30 24 18 40 18Z" fill={color} />
    <circle cx="30" cy="38" r="4" fill="white" opacity="0.45" />
    <path d="M18 44 Q10 44 12 52" stroke={color} strokeWidth="2.5" fill="none" />
    <path d="M62 44 Q70 44 68 52" stroke={color} strokeWidth="2.5" fill="none" />
  </svg>
)

export const MicrobeBlob29 = ({ color = "#BAE6FD" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <ellipse cx="40" cy="40" rx="20" ry="22" fill={color} />
    <circle cx="32" cy="32" r="3.2" fill="white" opacity="0.5" />
    <path d="M34 20 L30 10" stroke={color} strokeWidth="2.5" />
    <path d="M46 20 L50 10" stroke={color} strokeWidth="2.5" />
    <path d="M40 62 L40 74" stroke={color} strokeWidth="2.5" />
  </svg>
)

export const MicrobeBlob30 = ({ color = "#D9F99D" }: { color?: string }) => (
  <svg viewBox="0 0 80 80" className="h-16 w-16">
    <path d="M40 14 L56 22 L64 38 L58 56 L42 64 L24 58 L16 40 L24 24 Z" fill={color} />
    <circle cx="36" cy="34" r="3.5" fill="white" opacity="0.45" />
    <circle cx="46" cy="46" r="6" fill="white" opacity="0.2" />
  </svg>
)

export const microbeComponents = [
  MicrobeBlob1,
  MicrobeBlob2,
  MicrobeBlob3,
  MicrobeBlob4,
  MicrobeBlob5,
  MicrobeBlob6,
  MicrobeBlob7,
  MicrobeBlob8,
  MicrobeBlob9,
  MicrobeBlob10,
  MicrobeBlob11,
  MicrobeBlob12,
  MicrobeBlob13,
  MicrobeBlob14,
  MicrobeBlob15,
  MicrobeBlob16,
  MicrobeBlob17,
  MicrobeBlob18,
  MicrobeBlob19,
  MicrobeBlob20,
  MicrobeBlob21,
  MicrobeBlob22,
  MicrobeBlob23,
  MicrobeBlob24,
  MicrobeBlob25,
  MicrobeBlob26,
  MicrobeBlob27,
  MicrobeBlob28,
  MicrobeBlob29,
  MicrobeBlob30,
]

export function Tooltip({ children, text }: { children: ReactNode; text: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 max-w-xs -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-left text-xs whitespace-normal text-white">
          {text}
        </span>
      )}
    </span>
  )
}

export function TraitBadgeChip({
  trait,
  chipClassName = "h-6 w-6",
}: {
  trait: string
  chipClassName?: string
}) {
  const tc = traitColor(trait)
  return (
    <Tooltip text={trait}>
      <span
        className={`inline-flex shrink-0 cursor-default items-center justify-center rounded-full ${chipClassName}`}
        style={{
          backgroundColor: traitChipBg(trait),
          color: tc,
        }}
      >
        {traitIcon(trait, "h-3.5 w-3.5")}
      </span>
    </Tooltip>
  )
}

export function SlotTraitBadge({ trait }: { trait: string }) {
  const tc = traitColor(trait)
  return (
    <Tooltip text={trait}>
      <span
        className="inline-flex size-[32px] shrink-0 cursor-default items-center justify-center rounded-full text-[11px]"
        style={{
          backgroundColor: traitChipBg(trait),
          color: tc,
        }}
      >
        {traitIcon(trait, "h-[11px] w-[11px]")}
      </span>
    </Tooltip>
  )
}

export function MicrobeAttributeRowGrid({
  Mobility,
  Agility,
  Size,
}: {
  Mobility: number
  Agility: number
  Size: number
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-[12px] leading-none">
      <Tooltip text="Mobility">
        <span className="inline-flex items-center gap-0.5">
          <svg className="h-3.5 w-3.5 shrink-0 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
            <rect x="1" y="1" width="4" height="4" />
            <rect x="6" y="1" width="4" height="4" />
            <rect x="11" y="1" width="4" height="4" />
            <rect x="1" y="6" width="4" height="4" />
            <rect x="6" y="6" width="4" height="4" />
            <rect x="11" y="6" width="4" height="4" />
            <rect x="1" y="11" width="4" height="4" />
            <rect x="6" y="11" width="4" height="4" />
            <rect x="11" y="11" width="4" height="4" />
          </svg>
          <span className="tabular-nums leading-none text-gray-700">{Mobility}</span>
        </span>
      </Tooltip>
      <Tooltip text="Agility">
        <span className="inline-flex items-center gap-0.5">
          <svg className="h-3.5 w-3.5 shrink-0 text-yellow-500" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9 1L4 9h4l-1 6 5-8H8l1-6z" />
          </svg>
          <span className="tabular-nums leading-none text-gray-700">{Agility}</span>
        </span>
      </Tooltip>
      <Tooltip text="Size">
        <span className="inline-flex items-center gap-0.5">
          <svg className="h-3.5 w-3.5 shrink-0 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 15L1 1L15 15H1Z" opacity="0.6" />
            <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <span className="tabular-nums leading-none text-gray-700">{Size}</span>
        </span>
      </Tooltip>
    </div>
  )
}

export function MicrobeAttributeRow({
  Mobility,
  Agility,
  Size,
  inviableAttributes = [],
  highlightInviable = false,
  layout = "wrap",
}: {
  Mobility: number
  Agility: number
  Size: number
  inviableAttributes?: string[]
  highlightInviable?: boolean
  /** Use `nowrap` on narrow pool/tray cards when the row should stay on one line. */
  layout?: "wrap" | "nowrap"
}) {
  const inv = inviableAttributes
  const statWithTooltip = (
    name: "Mobility" | "Agility" | "Size",
    value: number,
    icon: ReactNode,
    label: string,
  ) => {
    const isInviable = highlightInviable && inv.includes(name)
    const base = (
      <span className="inline-flex items-center gap-0.5">
        {icon}
        {isInviable ? (
          <span
            className="tabular-nums leading-none decoration-dotted underline underline-offset-2"
            style={{ color: "#dc2626", fontWeight: "bold" }}
          >
            • {value}
          </span>
        ) : (
          <span className="tabular-nums leading-none text-gray-700">{value}</span>
        )}
      </span>
    )
    return isInviable ? <Tooltip text={INVIABLE_ATTRIBUTE_TITLE}>{base}</Tooltip> : <Tooltip text={label}>{base}</Tooltip>
  }

  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 text-[12px] leading-none sm:gap-2 ${layout === "nowrap" ? "flex-nowrap" : "flex-wrap"}`}
    >
      {statWithTooltip(
        "Mobility",
        Mobility,
        <svg className="h-3.5 w-3.5 shrink-0 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="1" width="4" height="4" />
          <rect x="6" y="1" width="4" height="4" />
          <rect x="11" y="1" width="4" height="4" />
          <rect x="1" y="6" width="4" height="4" />
          <rect x="6" y="6" width="4" height="4" />
          <rect x="11" y="6" width="4" height="4" />
          <rect x="1" y="11" width="4" height="4" />
          <rect x="6" y="11" width="4" height="4" />
          <rect x="11" y="11" width="4" height="4" />
        </svg>,
        "Mobility",
      )}
      {statWithTooltip(
        "Agility",
        Agility,
        <svg className="h-3.5 w-3.5 shrink-0 text-yellow-500" viewBox="0 0 16 16" fill="currentColor">
          <path d="M9 1L4 9h4l-1 6 5-8H8l1-6z" />
        </svg>,
        "Agility",
      )}
      {statWithTooltip(
        "Size",
        Size,
        <svg className="h-3.5 w-3.5 shrink-0 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1 15L1 1L15 15H1Z" opacity="0.6" />
          <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>,
        "Size",
      )}
    </div>
  )
}

export function SlotAttributeRow({
  Mobility,
  Agility,
  Size,
  inviableAttributes = [],
}: {
  Mobility: number
  Agility: number
  Size: number
  inviableAttributes?: string[]
}) {
  const inv = new Set(inviableAttributes)
  const stat = (name: "Mobility" | "Agility" | "Size", value: number) =>
    inv.has(name) ? (
      <Tooltip text={INVIABLE_ATTRIBUTE_TITLE}>
        <span
          className="font-bold tabular-nums decoration-dotted underline underline-offset-2"
          style={{ color: "#dc2626" }}
        >
          ⓘ {value}
        </span>
      </Tooltip>
    ) : (
      <span className="font-bold tabular-nums text-gray-800">{value}</span>
    )
  return (
    <div className="flex w-full flex-col gap-1 px-2 text-[12px] leading-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <svg className="size-[13px] shrink-0 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
            <rect x="1" y="1" width="4" height="4" />
            <rect x="6" y="1" width="4" height="4" />
            <rect x="11" y="1" width="4" height="4" />
            <rect x="1" y="6" width="4" height="4" />
            <rect x="6" y="6" width="4" height="4" />
            <rect x="11" y="6" width="4" height="4" />
            <rect x="1" y="11" width="4" height="4" />
            <rect x="6" y="11" width="4" height="4" />
            <rect x="11" y="11" width="4" height="4" />
          </svg>
          <span className="text-gray-600">Mobility</span>
        </div>
        {stat("Mobility", Mobility)}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <svg className="size-[13px] shrink-0 text-yellow-500" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9 1L4 9h4l-1 6 5-8H8l1-6z" />
          </svg>
          <span className="text-gray-600">Agility</span>
        </div>
        {stat("Agility", Agility)}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <svg className="size-[13px] shrink-0 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 15L1 1L15 15H1Z" opacity="0.6" />
            <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <span className="text-gray-600">Size</span>
        </div>
        {stat("Size", Size)}
      </div>
    </div>
  )
}

export function RangeTrack(props: {
  attrName: string
  min: number
  max: number
  highlight: boolean
  sliderStart: number
  onSliderChange: (name: string, val: number) => void
}) {
  const { attrName, highlight, sliderStart, onSliderChange } = props
  const leftPct = ((sliderStart - 1) / 9) * 100
  const widthPct = (2 / 9) * 100
  return (
    <div className="relative flex min-w-[120px] max-w-[220px] flex-1 items-center">
      <div className="pointer-events-none absolute -top-5 left-0 right-0 flex justify-between text-[9px] font-medium text-gray-400">
        <span>1</span>
        <span>10</span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-gray-200">
        <div
          className={`absolute top-0 h-full rounded-full transition-colors ${
            highlight ? "bg-[#4ECDC4]" : "bg-[#4ECDC4]/20"
          }`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        />
        {highlight ? (
          <div
            className="pointer-events-none absolute top-1/2 z-[5] flex -translate-y-1/2 items-center justify-center gap-0.5"
            style={{ left: `${leftPct + widthPct / 2 - 2}%` }}
          >
            <div className="h-2 w-0.5 rounded-full bg-white/80" />
            <div className="h-2 w-0.5 rounded-full bg-white/80" />
          </div>
        ) : null}
      </div>
      {highlight ? (
        <input
          type="range"
          min={1}
          max={8}
          step={1}
          value={sliderStart}
          onChange={(e) => {
            e.stopPropagation()
            onSliderChange(attrName, Number(e.target.value))
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`${attrName} profile range (length 3)`}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
      ) : null}
    </div>
  )
}

export function ToggleSwitch({ on, disabled }: { on: boolean; disabled?: boolean }) {
  return (
    <span
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors ${
        on ? "border-[#4ECDC4] bg-[#4ECDC4]" : "border-gray-300 bg-gray-200"
      } ${disabled ? "opacity-50" : ""}`}
      aria-hidden
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </span>
  )
}

export function SharedTopBar({
  timeRemaining,
  currentSiteHighlight,
  phaseLabel,
  progressPercent,
  sitesShown = 3,
}: {
  timeRemaining: number
  currentSiteHighlight: 1 | 2 | 3
  phaseLabel: string
  progressPercent: number
  /** Standalone Phase 4 treatment: one site only. Full game: three sites. */
  sitesShown?: 1 | 3
}) {
  return (
    <div className="sticky top-0 z-40 flex shrink-0 flex-col bg-[rgba(20,30,50,0.95)] backdrop-blur">
      <div className="relative flex h-14 items-center justify-between px-4">
        <div className="relative z-10 flex min-w-0 flex-1 items-center gap-1">
          {sitesShown === 1 ? (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 shrink-0 rounded-full bg-blue-500" />
              <span className="text-xs text-white md:text-sm">Site 1</span>
            </div>
          ) : (
            ([1, 2, 3] as const).map((n, idx) => {
              const active = currentSiteHighlight === n
              const dotClass = active ? "bg-blue-500" : "border-2 border-gray-500 bg-transparent"
              const labelClass = active ? "text-white" : "text-gray-400"
              return (
                <div key={n} className="flex items-center">
                  {idx > 0 ? <div className="mx-1 h-0.5 w-4 bg-gray-600 md:w-6" aria-hidden /> : null}
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 shrink-0 rounded-full ${dotClass}`} />
                    <span className={`text-xs md:text-sm ${labelClass}`}>Site {n}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center sm:flex">
          <span className="text-xs tabular-nums text-white md:text-sm">Time: {formatCountdown(timeRemaining)}</span>
          <div className="mt-0.5 h-1.5 w-40 overflow-hidden rounded-full bg-gray-700 md:h-2 md:w-64">
            <div className="h-full rounded-full bg-green-500 transition-all duration-700" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="relative z-10 flex min-w-0 flex-1 items-center justify-end gap-2 md:gap-3">
          <button type="button" className="text-white/70 hover:text-white" aria-label="Settings">
            <Settings className="h-5 w-5" />
          </button>
          <Link href="/" className="text-white/70 hover:text-white" aria-label="Exit">
            <LogOut className="h-5 w-5" />
          </Link>
        </div>
      </div>
      <div className="border-t border-gray-700/50 px-4 py-1 text-center text-[11px] text-gray-400 md:text-xs">{phaseLabel}</div>
      <div className="flex justify-center pb-2 sm:hidden">
        <span className="text-xs tabular-nums text-white">{formatCountdown(timeRemaining)}</span>
      </div>
    </div>
  )
}

export const INVIABLE_ATTRIBUTE_TITLE =
  "Inviable: even with the best possible partners, this microbe cannot keep the average within range for this attribute"
