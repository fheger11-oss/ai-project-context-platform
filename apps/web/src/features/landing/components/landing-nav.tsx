import { GitBranch, LogIn } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Product", href: "#product-proof" },
  { label: "Why Ctxaro", href: "#why-ctxaro" },
  { label: "FAQ", href: "#faq" }
];

export function LandingNav() {
  const githubLoginUrl = getGitHubLoginUrl();

  return (
    <header className="sticky top-0 z-30 w-screen max-w-[100vw] overflow-hidden border-b border-white/[0.07] bg-[#050706]/82 backdrop-blur-xl">
      <nav
        aria-label="Marketing navigation"
        className="mx-auto flex h-16 w-screen max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        <Link
          to="/landing"
          className="group flex shrink-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050706]"
          aria-label="Ctxaro landing page"
        >
          <span className="grid size-8 place-items-center rounded-md border border-primary/25 bg-primary/10 text-xs font-semibold text-primary shadow-[0_0_30px_rgba(69,211,154,0.12)]">
            C
          </span>
          <span className="text-sm font-semibold tracking-normal text-white">Ctxaro</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex" aria-label="Page sections">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050706]"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            asChild
            variant="ghost"
            className="hidden text-subtle-foreground hover:text-white sm:inline-flex"
          >
            <a href={githubLoginUrl}>
              <LogIn />
              Sign in
            </a>
          </Button>
          <Button asChild className="hidden h-9 px-3 text-xs sm:inline-flex sm:text-sm">
            <a href={githubLoginUrl}>
              Start for free
              <GitBranch />
            </a>
          </Button>
        </div>
      </nav>
    </header>
  );
}
