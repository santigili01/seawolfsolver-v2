const communities = ["r/consulting", "r/MBA", "PrepLounge"]

export function SocialProof() {
  return (
    <section className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-sm font-medium text-foreground">
          Used by candidates preparing for McKinsey, BCG, and Bain interviews.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {communities.map((item) => (
            <div
              key={item}
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
