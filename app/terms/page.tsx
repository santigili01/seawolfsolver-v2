import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service | SeaWolfPrep",
  description: "Terms of service for SeaWolfPrep.",
}

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-1px)] max-w-5xl flex-col px-4 py-8 md:px-6">
      <h1 className="sr-only">Terms of Service</h1>
      <iframe
        title="Terms of Service"
        src="/terms-of-service.html"
        className="min-h-[85dvh] w-full flex-1 rounded-lg border border-border bg-background shadow-sm"
      />
    </main>
  )
}
