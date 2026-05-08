"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Dashboard", href: "/dashboard", emoji: "📊" },
  { label: "Back to Home", href: "/", emoji: "🏠" },
  { label: "Sea Wolf", href: "/game", emoji: "🎮" },
  { label: "Content", href: "/content", emoji: "📄" },
  { label: "Solver", href: "/solver", emoji: "🔧" },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-[220px] min-h-screen bg-sidebar border-r border-sidebar-border shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="text-lg" aria-hidden="true">🐺</span>
        <span className="font-bold text-sidebar-foreground">SeaWolfPrep</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4">
        <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Navigation
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                    isActive
                      ? "bg-[#334155] text-white border-l-2 border-[#2563eb] pl-[10px]"
                      : "text-slate-300 hover:text-white hover:bg-[#334155]/70"
                  )}
                >
                  <span className={cn("text-sm", isActive ? "text-[#2563eb]" : "text-slate-400")}>
                    {item.emoji}
                  </span>
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Info */}
      <div className="px-2 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-medium">
            SE
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              seawolfprep
              <span className="ml-1 text-xs text-blue-300">⚡ Elite</span>
            </p>
            <p className="text-xs text-slate-300 truncate">
              support@seawolfprep.com
            </p>
          </div>
          <button className="p-1 text-slate-300 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
