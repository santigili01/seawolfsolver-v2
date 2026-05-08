import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Inbox | SeaWolfPrep",
  description: "Notifications and messages coming soon.",
}

export default function DashboardInboxPage() {
  return (
    <main className="p-8">
      <p className="text-xs tracking-widest text-gray-500 uppercase dark:text-gray-400">Inbox</p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">Coming soon</h1>
      <p className="mt-3 max-w-xl text-gray-600 dark:text-gray-300">
        Product updates and messages will show here when messaging is enabled.
      </p>
    </main>
  )
}
