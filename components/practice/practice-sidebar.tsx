import Link from "next/link"
import { DollarSign, Gamepad2, Home, Settings } from "lucide-react"

export function PracticeSidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white p-4">
      <div className="mb-8 flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          🧫
        </span>
        <span className="text-lg font-bold text-gray-900">SeaWolfPrep</span>
      </div>

      <nav className="space-y-2">
        <Link
          href="/practice"
          className="flex items-center gap-3 rounded-lg bg-[#1a202c] px-3 py-2 text-sm font-medium text-white"
        >
          <Home className="h-4 w-4" />
          Home
        </Link>
        <Link
          href="/practice"
          className="flex items-center gap-3 rounded-lg bg-[#1a202c] px-3 py-2 text-sm font-medium text-white"
        >
          <Gamepad2 className="h-4 w-4" />
          Practice
        </Link>
        <Link
          href="/pricing"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          <DollarSign className="h-4 w-4" />
          Pricing
        </Link>
        <div className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 opacity-50">
          <Settings className="h-4 w-4" />
          Settings (coming soon)
        </div>
      </nav>
    </aside>
  )
}
