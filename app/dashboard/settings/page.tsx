import type { Metadata } from "next"
import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { SettingsAppearanceCard } from "@/components/dashboard/settings/settings-appearance-card"
import { SettingsBillingCard } from "@/components/dashboard/settings/settings-billing-card"
import { SettingsClerkProfileCard } from "@/components/dashboard/settings/settings-clerk-profile-card"
import { SettingsDangerZoneCard } from "@/components/dashboard/settings/settings-danger-zone-card"
import { primaryOAuthProviderLabel } from "@/lib/clerk-oauth-display"

export const metadata: Metadata = {
  title: "Settings | SeaWolfPrep",
  description: "Account, billing, appearance, and danger zone.",
}

export default async function DashboardSettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in?redirect_url=/dashboard/settings")

  const user = await currentUser()
  if (!user) redirect("/sign-in?redirect_url=/dashboard/settings")

  const passwordEnabled = user.passwordEnabled === true
  const oauthProviderLabel = primaryOAuthProviderLabel(user)

  return (
    <main className="mx-auto max-w-5xl p-8">
      <p className="text-xs tracking-widest text-gray-500 uppercase dark:text-gray-400">Your account</p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
      <p className="mt-2 text-base text-gray-600 dark:text-gray-300">
        Account, billing, and how the app looks.
      </p>

      <div className="mt-10 flex flex-col gap-6">
        <SettingsClerkProfileCard />
        <SettingsBillingCard />
        <SettingsAppearanceCard />
        <SettingsDangerZoneCard passwordEnabled={passwordEnabled} oauthProviderLabel={oauthProviderLabel} />
      </div>
    </main>
  )
}
