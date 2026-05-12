import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | SeaWolfPrep",
  description: "Privacy policy for SeaWolfPrep.",
}

export default function PrivacyPage() {
  return (
    <main className="prose mx-auto max-w-3xl px-4 py-12">
      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 font-mono text-sm text-amber-900">
        {"<!-- TODO: Replace this content with real legal text generated via termly.io -->"}
      </p>
      <h1>Privacy Policy</h1>
      <p>
        SeaWolfPrep collects limited account, usage, and purchase information to operate the
        platform and provide access to simulation and solver tools. We process this information
        only for legitimate business purposes such as authentication, billing verification, and
        product quality improvements.
      </p>
      <p>
        We may store technical information like browser type, session events, and error logs to
        maintain reliability and prevent abuse. We do not sell personal information, and we
        implement reasonable administrative and technical safeguards to protect the data we hold.
      </p>
      <p>
        Third-party services may process data on our behalf, including infrastructure, analytics,
        authentication, and payment providers. These processors act under their own contractual and
        legal obligations, and your use of the platform constitutes acknowledgment of those service
        relationships.
      </p>
      <p>
        You may request access, correction, or deletion of eligible personal data, subject to legal
        and operational retention requirements. Contact: support@seawolfprep.com
      </p>
    </main>
  )
}
