import type { User } from "@clerk/backend"

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  github: "GitHub",
  microsoft: "Microsoft",
  facebook: "Facebook",
  apple: "Apple",
  discord: "Discord",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  twitch: "Twitch",
  twitter: "X",
  x: "X",
}

/** Normalize Clerk external account provider slug (e.g. `google`, `oauth_google`). */
export function formatOAuthProviderName(providerSlug: string): string {
  const key = providerSlug.toLowerCase().replace(/^oauth_/, "")
  return PROVIDER_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")
}

/** Primary linked social provider label for messaging, or null if none. */
export function primaryOAuthProviderLabel(user: User): string | null {
  const accounts = user.externalAccounts
  if (!accounts?.length) return null
  const raw = accounts[0]?.provider
  if (!raw) return null
  return formatOAuthProviderName(raw)
}
