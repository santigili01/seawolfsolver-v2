import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { format, parseISO } from "date-fns"
import type { MDXRemoteProps } from "next-mdx-remote/rsc"
import { MDXRemote } from "next-mdx-remote/rsc"
import { getAllPosts, getPostBySlug } from "@/lib/blog"

function formatPostDate(iso: string) {
  try {
    return format(parseISO(iso), "MMMM d, yyyy")
  } catch {
    return iso
  }
}

const mdxComponents: NonNullable<MDXRemoteProps["components"]> = {
  h2: (props) => <h2 className="mb-4 mt-10 text-2xl font-bold text-foreground" {...props} />,
  h3: (props) => <h3 className="mb-3 mt-8 text-xl font-semibold text-foreground" {...props} />,
  p: (props) => <p className="mb-6 text-base leading-relaxed text-foreground" {...props} />,
  a: (props) => <a className="text-primary underline underline-offset-2 hover:text-primary/90" {...props} />,
  ul: (props) => <ul className="mb-6 ml-6 list-disc space-y-2" {...props} />,
  ol: (props) => <ol className="mb-6 ml-6 list-decimal space-y-2" {...props} />,
  li: (props) => <li className="text-base leading-relaxed text-foreground" {...props} />,
  strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
  code: (props) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground" {...props} />
  ),
}

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) {
    return { title: "Post not found" }
  }
  return {
    title: `${post.title} | SeaWolfPrep`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) {
    notFound()
  }

  const body = await MDXRemote({
    source: post.content,
    components: mdxComponents,
  })

  return (
    <>
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/blog" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            ← Back to blog
          </Link>
          <span className="mt-6 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {post.category}
          </span>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold text-foreground">{post.title}</h1>
          <p className="mt-4 max-w-2xl text-xl text-muted-foreground">{post.description}</p>
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            <span aria-hidden className="text-border">
              |
            </span>
            <span>{post.readingTime}</span>
          </p>
        </div>
      </div>

      <article className="mx-auto mt-12 max-w-2xl px-6 pb-16">{body}</article>

      <section className="bg-[#1a202c] py-12">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white">Practice what you just learned.</h2>
          <p className="mt-2 text-white/70">Try the free Sea Wolf simulator — no signup required.</p>
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
