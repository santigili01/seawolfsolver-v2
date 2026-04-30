import Link from "next/link";

const links = [
  { href: "#features", label: "Solver" },
  { href: "#simulator", label: "Simulator" },
  { href: "#faq", label: "FAQ" },
  { href: "mailto:support@seawolfsolver.com", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🐺</span>
            <span className="text-lg font-bold text-foreground">
              Sea Wolf Solver
            </span>
          </Link>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Sea Wolf Solver
          </p>
        </div>
      </div>
    </footer>
  );
}
