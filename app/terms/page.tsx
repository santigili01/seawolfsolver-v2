import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service | SeaWolfPrep",
  description: "Terms of service for SeaWolfPrep.",
}

export default function TermsPage() {
  return (
    <main className="prose mx-auto max-w-3xl px-4 py-12">
      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 font-mono text-sm text-amber-900">
        {"<!-- TODO: Replace this content with real legal text generated via termly.io -->"}
      </p>
      <h1>Terms of Service</h1>
      <p>
        By accessing SeaWolfPrep, you agree to use the platform only for lawful purposes and in
        accordance with these terms. You are responsible for maintaining account security and for
        all activities performed under your credentials.
      </p>
      <p>
        SeaWolfPrep provides educational simulation and training tools and does not guarantee
        specific assessment outcomes, scores, or hiring results. Content and features may evolve
        over time, and we reserve the right to modify or discontinue portions of the service.
      </p>
      <p>
        You may not reverse engineer, redistribute proprietary content, or use automated systems to
        scrape or misuse platform data beyond normal personal use. Violations may result in account
        suspension or termination without prior notice.
      </p>
      <p>
        To the maximum extent permitted by law, liability is limited for indirect or consequential
        damages arising from platform use. Contact: support@seawolfprep.com
      </p>
    </main>
  )
}
