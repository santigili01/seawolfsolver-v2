import Link from "next/link"
import { BarChart3, DollarSign, Gamepad2, Home, LayoutDashboard } from "lucide-react"

function itemClasses(active = false) {
  return active
    ? "flex items-center gap-3 rounded-lg bg-[#1a202c] px-3 py-2 text-sm font-medium text-white"
    : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
}

export function DashboardSidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white p-4">
      <div className="mb-8 flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          🧫
        </span>
        <span className="text-lg font-bold text-gray-900">SeaWolfPrep</span>
      </div>

      <nav className="space-y-2">
        <Link href="/dashboard" className={itemClasses(true)}>
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
        <Link href="/practice" className={itemClasses()}>
          <Home className="h-4 w-4" />
          Practice Hub
        </Link>
        <Link href="/game" className={itemClasses()}>
          <Gamepad2 className="h-4 w-4" />
          Full Simulator
        </Link>
        <Link href="/solver" className={itemClasses()}>
          <BarChart3 className="h-4 w-4" />
          Solver
        </Link>
        <Link href="/pricing" className={itemClasses()}>
          <DollarSign className="h-4 w-4" />
          Pricing
        </Link>
      </nav>
    </aside>
  )
}
