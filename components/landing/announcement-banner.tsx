import { Sparkles } from "lucide-react";

export function AnnouncementBanner() {
  return (
    <div className="bg-primary/10 px-4 py-2.5 text-center">
      <p className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
        <Sparkles className="size-4" />
        <span>Now includes AI Simulator — Free with every purchase</span>
      </p>
    </div>
  );
}
