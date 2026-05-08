import type { Metadata } from "next"
import { AnnouncementBanner } from "@/components/landing/announcement-banner";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { TrustBadges } from "@/components/landing/trust-badges";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "SeaWolfPrep — McKinsey Solve Sea Wolf Practice & Solver | SeaWolfPrep",
  description:
    "Browser-native simulator and solver for the McKinsey Solve Sea Wolf assessment. All 4 phases. 300+ scenarios. Lifetime access.",
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <AnnouncementBanner />
      <Navbar />
      <main>
        <Hero />
        <TrustBadges />
        <HowItWorks />
        <Features />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
