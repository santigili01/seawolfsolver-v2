import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Refund Policy | SeaWolfPrep",
  description: "Refund policy for SeaWolfPrep purchases.",
}

export default function RefundPolicyPage() {
  return (
    <main className="prose mx-auto max-w-3xl px-4 py-12">
      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 font-mono text-sm text-amber-900">
        {"<!-- TODO: Replace this content with real legal text generated via termly.io -->"}
      </p>
      <h1>Refund Policy</h1>
      <p>
        SeaWolfPrep purchases are one-time payments for lifetime product access to the selected
        tier. Because access is granted immediately, refunds are typically not available except in
        cases of duplicate billing, technical purchase failure, or legal requirements.
      </p>
      <p>
        If you believe you were charged in error, contact support within a reasonable timeframe and
        include your purchase email and receipt details. We review requests in good faith and may
        issue refunds at our discretion where appropriate.
      </p>
      <p>
        Approved refunds are returned to the original payment method based on processor timelines.
        Contact: support@seawolfprep.com
      </p>
    </main>
  )
}
