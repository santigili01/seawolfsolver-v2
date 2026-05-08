import Link from "next/link"

const badgeToneClasses = {
  green: "bg-emerald-100 text-emerald-800",
  blue: "bg-blue-100 text-blue-800",
  gray: "bg-gray-200 text-gray-700",
} as const

export function GameCard({
  title,
  subtitle,
  description,
  badge,
  href,
  cta,
}: {
  title: string
  subtitle: string
  description: string
  badge: { label: string; tone: "green" | "blue" | "gray" }
  href: string
  cta: string
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-[#4ECDC4] to-[#2BA8A0]">
        <span
          className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeToneClasses[badge.tone]}`}
        >
          {badge.label}
        </span>
        <p className="px-4 text-center text-3xl font-extrabold text-white">{title}</p>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs tracking-wide text-gray-500 uppercase">{subtitle}</p>
        <p className="text-base font-bold text-gray-900">{title}</p>
        <p className="line-clamp-2 text-sm text-gray-600">{description}</p>
        <Link
          href={href}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a202c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a3040]"
        >
          {cta}
        </Link>
      </div>
    </div>
  )
}
