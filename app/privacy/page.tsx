import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | SeaWolfPrep",
  description: "Privacy policy for SeaWolfPrep.",
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-1px)] max-w-5xl flex-col px-4 py-8 md:px-6">
      <h1 className="sr-only">Privacy Policy</h1>
      <iframe
        title="Privacy Policy"
        src="/privacy-policy.html"
        className="min-h-[85dvh] w-full flex-1 rounded-lg border border-border bg-background shadow-sm"
      />
    </main>
  )
}
