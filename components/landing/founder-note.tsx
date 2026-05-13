export function FounderNote() {
  return (
    <section
      className="mt-16 w-full bg-[#f8fafc] py-16"
      aria-label="Founder note"
    >
      <div className="mx-auto max-w-2xl text-center sm:text-left">
        <blockquote className="border-l-4 border-[#4ECDC4] pl-6 sm:pl-8">
          <p className="text-xl italic leading-relaxed text-muted-foreground sm:text-2xl">
            I built this after spending $200+ on prep tools that barely covered one phase. There&apos;s a better way.
          </p>
          <footer className="mt-4 text-sm font-medium not-italic text-foreground">— Santiago, Founder</footer>
        </blockquote>
      </div>
    </section>
  )
}
