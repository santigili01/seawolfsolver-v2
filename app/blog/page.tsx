import type { Metadata } from "next"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { getAllPosts } from "@/lib/blog"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Blog | SeaWolfPrep",
  description:
    "Strategy guides, scoring breakdowns, and prep tips for McKinsey Solve Sea Wolf candidates.",
  openGraph: {
    title: "Guides & Resources | SeaWolfPrep",
    description:
      "Strategy guides, scoring breakdowns, and prep tips for McKinsey Solve candidates.",
  },
}

const categories = ["All", "Guide", "Strategy", "News"] as const

function formatPostDate(iso: string) {
  try {
    return format(parseISO(iso), "MMMM d, yyyy")
  } catch {
    return iso
  }
}

export default function BlogIndexPage() {
  const posts = getAllPosts()

  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">SEAWOLFPREP BLOG</p>
          <h1 className="mt-2 text-4xl font-bold text-foreground">Guides & Resources</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Strategy guides, scoring breakdowns, and prep tips for McKinsey Solve candidates.
          </p>
          <Link href="/sea-wolf-demo" className="mt-4 block text-sm font-medium text-primary hover:underline">
            Try the free simulator →
          </Link>
        </div>
      </section>

      <nav
        className="border-b border-border bg-background"
        aria-label="Blog categories"
      >
        {/* TODO: add client-side filtering */}
        <div className="mx-auto flex max-w-6xl flex-wrap gap-2 px-6 py-4">
          {categories.map((cat) => {
            const active = cat === "All"
            return (
              <span
                key={cat}
                className={cn(
                  "rounded-full px-4 py-2 text-sm",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {cat}
              </span>
            )
          })}
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-12">
        {posts.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">No posts yet — check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className={cn(
                  "group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow duration-200 hover:shadow-md",
                )}
              >
                <div className={cn("h-2 shrink-0", post.featured ? "bg-primary" : "bg-muted")} />
                <div className="flex flex-1 flex-col p-6">
                  <span className="inline-flex w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {post.category}
                  </span>
                  <h2 className="mt-3 text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                    {post.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{post.description}</p>
                  <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
                    <time className="text-xs text-muted-foreground" dateTime={post.date}>
                      {formatPostDate(post.date)}
                    </time>
                    <span className="text-xs text-muted-foreground">{post.readingTime}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <section className="mt-16 bg-[#1a202c] py-12">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white">Ready to practice?</h2>
          <p className="mt-2 text-white/70">Try one free Sea Wolf scenario — no signup required.</p>
          <Link
            href="/sea-wolf-demo"
            className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try Free Demo →
          </Link>
        </div>
      </section>
    </>
  )
}
