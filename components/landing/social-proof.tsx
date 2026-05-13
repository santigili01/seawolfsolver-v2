export function SocialProof() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-12 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Built to give you every advantage
        </p>
        <div className="flex flex-col items-stretch gap-10 sm:flex-row sm:items-center sm:justify-center sm:gap-0">
          <div className="flex flex-1 flex-col items-center text-center">
            <p className="text-5xl font-bold text-foreground">300+</p>
            <p className="mt-2 text-base text-muted-foreground">Unique scenarios</p>
          </div>
          <div className="hidden h-10 w-px shrink-0 self-center bg-border sm:block" aria-hidden />
          <div className="flex flex-1 flex-col items-center text-center">
            <p className="text-5xl font-bold text-foreground">4 Phases</p>
            <p className="mt-2 text-base text-muted-foreground">Simulator and solver</p>
          </div>
          <div className="hidden h-10 w-px shrink-0 self-center bg-border sm:block" aria-hidden />
          <div className="flex flex-1 flex-col items-center text-center">
            <p className="text-5xl font-bold text-foreground">$15</p>
            <p className="mt-2 text-base text-muted-foreground">Starting price</p>
          </div>
        </div>
      </div>
    </section>
  )
}
