import { Check } from "lucide-react";

const badges = [
  "Instantly calculates optimal microbes",
  "Maximizes your score every time",
  "Saves critical time during assessment",
  "100% accurate, no trial-and-error",
];

export function TrustBadges() {
  return (
    <section className="border-y border-border bg-card px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {badges.map((badge, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg bg-secondary/50 px-4 py-3"
            >
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary">
                <Check className="size-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
