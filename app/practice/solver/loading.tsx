export default function SolverLoading() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl items-center justify-center px-6">
      <div className="w-full rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-4 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mt-8 h-56 animate-pulse rounded-lg bg-gray-100" />
      </div>
    </main>
  )
}
