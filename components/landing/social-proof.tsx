const schools = [
  "Harvard",
  "Stanford",
  "INSEAD",
  "Wharton",
  "LBS",
];

export function SocialProof() {
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Used by candidates from
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-8 lg:gap-12">
          {schools.map((school) => (
            <div
              key={school}
              className="text-lg font-semibold tracking-tight text-muted-foreground/60 transition-colors hover:text-muted-foreground"
            >
              {school}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
