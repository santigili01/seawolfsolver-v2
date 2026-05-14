import { Footer } from "@/components/landing/footer"
import { Navbar } from "@/components/landing/navbar"

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
