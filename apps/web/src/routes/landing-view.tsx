import { ContextRail } from "@/features/landing/components/context-rail";
import { HeroSection } from "@/features/landing/components/hero-section";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { MotionBackground } from "@/features/landing/components/motion-background";

export function LandingView() {
  return (
    <div className="dark min-h-screen overflow-x-hidden bg-[#050706] text-foreground">
      <MotionBackground />
      <LandingNav />
      <main className="relative">
        <div className="mx-auto flex w-full max-w-[92rem]">
          <ContextRail className="ml-4" />
          <div className="min-w-0 flex-1">
            <HeroSection />
            <section
              id="how-it-works"
              className="mx-auto w-full max-w-7xl px-4 pb-24 pt-4 sm:px-6 lg:px-8"
              aria-label="How Ctxaro works"
            >
              <div className="border-t border-white/10 pt-8">
                <p className="max-w-2xl font-mono text-xs uppercase tracking-[0.2em] text-primary">
                  Repository - Scan - Understand - Context - Documents - AI Export
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
