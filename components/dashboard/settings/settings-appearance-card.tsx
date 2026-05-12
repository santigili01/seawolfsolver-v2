"use client"

import { DashboardSidebarThemeToggle } from "@/components/dashboard/dashboard-sidebar-theme-toggle"

export function SettingsAppearanceCard() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Theme</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Switch between light and dark appearance.</p>
        </div>
        <div className="w-full max-w-xs">
          <DashboardSidebarThemeToggle />
        </div>
      </div>
    </section>
  )
}
