import type { Metadata } from "next"
import { PracticeHub } from "@/components/practice/practice-hub"
import { PracticeSidebar } from "@/components/practice/practice-sidebar"

export const metadata: Metadata = {
  title: "Practice Hub | SeaWolfPrep",
  description:
    "Central hub for launching Sea Wolf practice runs and tools.",
}

export default function PracticePage() {
  return (
    <div className="flex min-h-screen">
      <PracticeSidebar />
      <PracticeHub />
    </div>
  )
}
