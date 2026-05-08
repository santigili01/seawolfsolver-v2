import Link from "next/link"
import { ArrowUpRight, Clock3, ShieldCheck, UserRound } from "lucide-react"
import type { AccessTier } from "@/lib/dashboard-access"

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
    <main className="p-8">
      <p className="text-xs tracking-widest text-gray-500 uppercase dark:text-gray-400">USER DASHBOARD</p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">Welcome back, {displayName}.</h1>
      <p className="mt-3 max-w-2xl text-base text-gray-600 dark:text-gray-300">
        Review your account, access tier, and recent activity. This dashboard is ready for future
        run-history sync.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-center gap-2">
            <UserRound className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Account settings</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
              <p className="text-xs text-gray-500 uppercase dark:text-gray-400">Display name</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{displayName}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
              <p className="text-xs text-gray-500 uppercase dark:text-gray-400">Email</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{email || "Unavailable"}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            Manage profile and security in{" "}
            <Link href="/dashboard/settings" className="font-semibold text-[#2563eb] hover:underline">
              Settings
            </Link>
            .
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Subscription</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">Current access tier</p>
          <p className="mt-1 text-base font-bold text-gray-900 dark:text-gray-100">{tierLabel(accessTier)}</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
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
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Game history</h2>
          </div>
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800/80">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">No saved runs yet</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Run persistence is not wired in this build yet. Your previous sessions are not
              stored server-side.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quick actions</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link
              href="/game"
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              Start full simulator
            </Link>
            <Link
              href="/solver"
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              Open solver
            </Link>
            <Link
              href="/practice"
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              Go to practice hub
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              Manage plan
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
