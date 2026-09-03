import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { CtxaroWordmark } from "@/features/brand/components/ctxaro-brand";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";

export function LandingFooter() {
  const githubLoginUrl = getGitHubLoginUrl();

  return (
    <footer className="relative border-t border-white/10 px-4 py-10 sm:px-6 lg:px-8">
      <div
        className="landing-footer-signal absolute inset-x-0 top-0 h-px bg-white/10"
        aria-hidden="true"
      />
      <div className="mx-auto grid w-full max-w-7xl gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050706]"
            aria-label="ctxaro home"
          >
            <CtxaroWordmark />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
            Structured context for real codebases.
          </p>
        </div>

        <FooterGroup
          title="Product"
          links={[
            { label: "How it works", href: "#how-it-works" },
            { label: "Product", href: "#product-proof" },
            { label: "Why Ctxaro", href: "#why-ctxaro" }
          ]}
        />

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Resources
          </p>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <Link
              to="/privacy"
              className="w-fit rounded-md outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050706]"
            >
              Privacy
            </Link>
            <span>Documentation — Coming soon</span>
            <span>Pricing — Coming soon</span>
          </div>
        </div>

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Account
          </p>
          <div className="mt-4 grid gap-3">
            <Button asChild size="sm" className="w-fit">
              <a href={githubLoginUrl}>
                Get started
                <ArrowRight />
              </a>
            </Button>
            <a
              href={githubLoginUrl}
              className="w-fit rounded-md text-sm text-muted-foreground outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050706]"
            >
              Sign in
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({
  links,
  title
}: {
  links: { href: string; label: string }[];
  title: string;
}) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </p>
      <nav className="mt-4 grid gap-3" aria-label={`${title} footer navigation`}>
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="w-fit rounded-md text-sm text-muted-foreground outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050706]"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
