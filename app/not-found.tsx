import Link from "next/link"

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold tracking-wide text-gray-500 uppercase">404</p>
      <h1 className="mt-3 text-3xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-3 text-gray-600">
        This route does not exist or may have moved.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-[#1a202c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a3040]"
        >
          Go home
        </Link>
        <Link
          href="/practice"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Open practice hub
        </Link>
      </div>
    </main>
  )
}
