"use client"

import Link from "next/link"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold tracking-wide text-red-600 uppercase">Something went wrong</p>
      <h1 className="mt-3 text-3xl font-bold text-gray-900">Unexpected application error</h1>
      <p className="mt-3 text-gray-600">
        We hit an unexpected issue while loading this page. You can retry or head back to a stable route.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-[#1a202c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a3040]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Go home
        </Link>
      </div>
    </main>
  )
}
