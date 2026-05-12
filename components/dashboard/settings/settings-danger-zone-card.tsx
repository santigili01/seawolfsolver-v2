"use client"

import { useState, useTransition } from "react"
import { useClerk } from "@clerk/nextjs"
import { Trash2, TriangleAlert } from "lucide-react"
import { deleteAccount } from "@/app/dashboard/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function SettingsDangerZoneCard({
  passwordEnabled,
  oauthProviderLabel,
}: {
  passwordEnabled: boolean
  oauthProviderLabel: string | null
}) {
  const { signOut } = useClerk()
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onDelete = () => {
    setMessage(null)
    startTransition(async () => {
      const res = await deleteAccount(password)
      if (res.ok) {
        try {
          await signOut({ redirectUrl: "/" })
        } catch {
          window.location.href = "/"
        }
        return
      }
      setMessage(res.error)
    })
  }

  return (
    <section className="rounded-xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/50 dark:bg-gray-900">
      <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-red-700 dark:text-red-400">
        <TriangleAlert className="h-5 w-5 shrink-0" aria-hidden />
        Danger zone
      </h2>

      {!passwordEnabled ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50/80 p-5 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="text-sm font-semibold text-red-900 dark:text-red-200">Delete account</p>
          <p className="mt-2 text-sm text-red-900/90 dark:text-red-100/90">
            {oauthProviderLabel
              ? `You are logged in with ${oauthProviderLabel}. In-app password deletion is only available for email and password accounts.`
              : "In-app account deletion with a password is only available for email and password accounts."}{" "}
            Use the profile menu (top right) to open Clerk account settings, or manage your account through your
            sign-in provider.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50/80 p-5 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="text-sm font-semibold text-red-900 dark:text-red-200">Delete account</p>
          <p className="mt-2 text-sm text-red-900/90 dark:text-red-100/90">
            Permanently delete your account and remove linked purchase rows where possible. Payment processor records may
            be retained for audit. <span className="font-semibold">This cannot be undone.</span> Requires your account
            password.
          </p>

          <div className="mt-4">
            <Label htmlFor="delete-password" className="text-xs font-medium text-red-900 dark:text-red-200">
              Confirm with password
            </Label>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="mt-1.5 bg-white dark:bg-gray-900"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={pending || !password.trim()}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {pending ? "Deleting…" : "Delete account"}
            </Button>
            {message ? <p className="text-sm text-red-700 dark:text-red-300">{message}</p> : null}
          </div>
        </div>
      )}
    </section>
  )
}
