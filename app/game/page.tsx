import { redirect } from "next/navigation"

/** Alias for the full-session simulator (see `app/practice/sea-wolf/page.tsx`). */
export default function GameAliasPage() {
  redirect("/practice/sea-wolf")
}
