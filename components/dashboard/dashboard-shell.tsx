import Link from "next/link"
import { ArrowUpRight, Clock3, ShieldCheck, UserRound } from "lucide-react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

export type AccessTier = "none" | "simulator" | "simulator_solver"

function tierLabel(accessTier: AccessTier): string {
  if (accessTier === "simulator_solver") return "Simulator + Solver (Lifetime)"
  if (accessTier === "simulator") return "Simulator (Lifetime)"
  return "No active purchase"
}

export function DashboardShell({
  displayName,
  email,
  accessTier,
  hasAccess,
}: {
  displayName: string
  email: string
  accessTier: AccessTier
  hasAccess: boolean
}) {
  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <main className="flex-1 bg-gray-50 p-8">
        <p className="text-xs tracking-widest text-gray-500 uppercase">USER DASHBOARD</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Welcome back, {displayName}.</h1>
        <p className="mt-3 max-w-2xl text-base text-gray-600">
          Review your account, access tier, and recent activity. This dashboard is ready for future
          run-history sync.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Account settings</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500 uppercase">Display name</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{displayName}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500 uppercase">Email</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{email || "Unavailable"}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Profile and security settings are managed through the Clerk account menu in the top
              navigation bar.
            </p>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
            </div>
            <p className="text-sm text-gray-600">Current access tier</p>
            <p className="mt-1 text-base font-bold text-gray-900">{tierLabel(accessTier)}</p>
            <p className="mt-2 text-xs text-gray-500">
              {hasAccess
                ? "You can access simulator content immediately."
                : "Upgrade to unlock full simulator access."}
            </p>
            {!hasAccess ? (
              <Link
                href="/pricing"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1a202c] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2a3040]"
              >
                View pricing
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            ) : null}
          </section>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Game history</h2>
            </div>
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-800">No saved runs yet</p>
              <p className="mt-1 text-sm text-gray-600">
                Run persistence is not wired in this build yet. Your previous sessions are not
                stored server-side.
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Quick actions</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Link
                href="/game"
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
              >
                Start full simulator
              </Link>
              <Link
                href="/solver"
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
              >
                Open solver
              </Link>
              <Link
                href="/practice"
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
              >
                Go to practice hub
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
              >
                Manage plan
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
