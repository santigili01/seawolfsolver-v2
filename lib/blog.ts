import "server-only"

import fs from "fs"
import path from "path"
import matter from "gray-matter"
import readingTime from "reading-time"

const BLOG_DIR = path.join(process.cwd(), "content/blog")

export type BlogPost = {
  slug: string
  title: string
  description: string
  date: string
  category: string
  readingTime: string
  featured: boolean
  content: string
}

function readFrontmatter(data: Record<string, unknown>, filename: string) {
  const slug =
    typeof data.slug === "string" && data.slug.length > 0
      ? data.slug
      : filename.replace(/\.mdx$/, "")
  return {
    slug,
    title: typeof data.title === "string" ? data.title : "Untitled",
    description: typeof data.description === "string" ? data.description : "",
    date: typeof data.date === "string" ? data.date : "",
    category: typeof data.category === "string" ? data.category : "Article",
    featured: Boolean(data.featured),
  }
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) {
    return []
  }

  const files = fs.readdirSync(BLOG_DIR)
  return files
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, f), "utf-8")
      const { data, content } = matter(raw)
      const fm = readFrontmatter(data as Record<string, unknown>, f)
      return {
        ...fm,
        readingTime: readingTime(content).text,
        content,
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return getAllPosts().find((p) => p.slug === slug)
}
