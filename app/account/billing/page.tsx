import { currentUser } from "@clerk/nextjs/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { supabaseAdmin } from "@/utils/supabase/admin"
import { planNameFromVariant } from "@/lib/lemon-billing"

export default async function BillingPage() {
  const user = await currentUser()
  if (!user) redirect("/sign-in?redirect_url=/account/billing")

  const { data: purchase } = await supabaseAdmin
    .from("purchases")
    .select("variant_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const planName = planNameFromVariant(purchase?.variant_id ?? null)

  const purchaseDate = purchase?.created_at
    ? new Date(purchase.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "linear-gradient(135deg, #4ECDC4, #2BA8A0)" }}
    >
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">Billing</h1>

        <div className="mb-6">
          <p className="mb-1 text-sm text-gray-500">Current plan</p>
          <p className="text-lg font-medium text-gray-900">{planName}</p>
          {purchaseDate ? (
            <p className="mt-1 text-sm text-gray-500">Purchased {purchaseDate}</p>
          ) : null}
          {purchase ? (
            <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Lifetime access
            </span>
          ) : null}
        </div>

        <div className="mb-6 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
          <iframe
            title="Lemon Squeezy customer portal"
            src="https://app.lemonsqueezy.com/my-orders"
            className="h-[min(420px,55vh)] w-full bg-white"
          />
        </div>

        {purchase ? (
          <Link
            href="https://app.lemonsqueezy.com/my-orders"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg border border-gray-200 px-4 py-2 text-center text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            View receipt / manage order →
          </Link>
        ) : null}
      </div>
    </div>
  )
}
