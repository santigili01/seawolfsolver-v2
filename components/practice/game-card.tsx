import Image from "next/image"
import Link from "next/link"

export function GameCard({
  title,
  subtitle,
  description,
  href,
  cta,
  thumbnailSrc,
}: {
  title: string
  subtitle: string
  description: string
  href: string
  cta: string
  thumbnailSrc?: string
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <Link
        href={href}
        aria-label={`${title}: ${cta}`}
        className={`group relative flex aspect-[4/3] shrink-0 items-center justify-center overflow-hidden no-underline outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[#1a202c] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${thumbnailSrc ? "bg-gray-900" : "bg-gradient-to-br from-[#4ECDC4] to-[#2BA8A0]"}`}
      >
        {thumbnailSrc ? (
          <>
            <Image
              src={thumbnailSrc}
              alt=""
              fill
              className="object-cover transition-[filter] duration-300 ease-out group-hover:blur-md group-hover:brightness-[0.55]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 ease-out group-hover:bg-black/35"
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100">
              <p className="text-center text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                {title}
              </p>
            </div>
          </>
        ) : (
          <p className="px-4 text-center text-3xl font-extrabold text-white">{title}</p>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs tracking-wide text-gray-500 uppercase">{subtitle}</p>
        <p className="text-xl font-bold text-gray-900">{title}</p>
        <p className="line-clamp-3 text-sm text-gray-600">{description}</p>
        <Link
          href={href}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a202c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a3040]"
        >
          {cta}
        </Link>
      </div>
    </div>
  )
}
