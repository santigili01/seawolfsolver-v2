import type { Metadata } from "next"
import { currentUser } from "@clerk/nextjs/server"
import { Footer } from "@/components/landing/footer"
import { Navbar } from "@/components/landing/navbar"
import { Pricing } from "@/components/landing/pricing"
import { getCheckoutUrl } from "@/lib/checkout"

export const metadata: Metadata = {
  title: "Pricing | SeaWolfPrep",
  description:
    "One-time payment, lifetime access. Practice the McKinsey Solve Sea Wolf assessment.",
}

const SIGN_IN_WITH_RETURN = "/sign-in?redirect_url=/pricing"

export default async function PricingPage() {
  const user = await currentUser()
  const userId = user?.id
  const email = user?.primaryEmailAddress?.emailAddress

  const simulatorVariant = process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR!
  const simulatorSolverVariant = process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR_SOLVER!

  const ctaLinks = {
    simulator: userId && email ? getCheckoutUrl(simulatorVariant, userId, email) : SIGN_IN_WITH_RETURN,
    simulatorSolver: userId && email ? getCheckoutUrl(simulatorSolverVariant, userId, email) : SIGN_IN_WITH_RETURN,
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Pricing ctaLinks={ctaLinks} sectionId={false} />
      </main>
      <Footer />
    </div>
  )
}
