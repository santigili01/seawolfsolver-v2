import Link from 'next/link'
import { currentUser } from '@clerk/nextjs/server'
import { getCheckoutUrl } from '@/lib/checkout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function PricingPage() {
  const user = await currentUser()
  const userId = user?.id
  const email = user?.primaryEmailAddress?.emailAddress

  const simulatorVariant = process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR!
  const simulatorSolverVariant = process.env.NEXT_PUBLIC_LMS_VARIANT_SIMULATOR_SOLVER!

  const simulatorUrl =
    userId && email ? getCheckoutUrl(simulatorVariant, userId, email) : '/sign-in'
  const simulatorSolverUrl =
    userId && email ? getCheckoutUrl(simulatorSolverVariant, userId, email) : '/sign-in'

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#4ECDC4] to-[#2BA8A0] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Choose your access</h1>
          <p className="mt-3 text-lg text-white/90">One-time payment. Lifetime access.</p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card className="rounded-xl border-white/50 bg-white shadow-lg">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl">Simulator</CardTitle>
              <p className="text-sm text-muted-foreground">Full Sea Wolf simulator access.</p>
              <p className="text-4xl font-bold">$15</p>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href={simulatorUrl}>Buy Now</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-white/50 bg-white shadow-lg">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl">Simulator + Solver</CardTitle>
              <p className="text-sm text-muted-foreground">
                Simulator plus advanced solver tools.
              </p>
              <p className="text-4xl font-bold">$25</p>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href={simulatorSolverUrl}>Buy Now</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
