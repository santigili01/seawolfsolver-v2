import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { supabaseAdmin } from "@/utils/supabase/admin"
import { planNameFromVariant } from "@/lib/lemon-billing"

export async function SettingsBillingCard() {
  const { userId } = await auth()
  if (!userId) return null

  const { data: purchase } = await supabaseAdmin
    .from("purchases")
    .select("variant_id, created_at")
    .eq("user_id", userId)
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
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Billing</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Purchases and receipts through Lemon Squeezy.
      </p>

      <div className="mt-4 rounded-xl bg-[#1a202c] px-5 py-4 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#4ECDC4]">Current plan</p>
            <p className="mt-2 text-xl font-bold">{planName}</p>
            {purchaseDate ? (
              <p className="mt-1 text-sm text-white/80">Purchased {purchaseDate}</p>
            ) : (
              <p className="mt-1 max-w-xl text-sm text-white/80">
                No purchase on file yet. Upgrade from pricing when you are ready.
              </p>
            )}
          </div>
          {purchase ? (
            <span className="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-200">
              Lifetime access
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
              Free
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-gray-200 pt-5 dark:border-gray-700">
        {purchase ? (
          <Link
            href="/api/billing-portal"
            prefetch={false}
            className="block w-full rounded-lg border border-gray-200 px-4 py-2 text-center text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            View order & receipt →
          </Link>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            After you purchase, a personalized order and receipt link will appear here.
          </p>
        )}
      </div>
    </section>
  )
}
