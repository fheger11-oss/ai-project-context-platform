import { ContextRail } from "@/features/landing/components/context-rail";
import { HeroSection } from "@/features/landing/components/hero-section";
import { HowItWorksSection } from "@/features/landing/components/how-it-works-section";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { MotionBackground } from "@/features/landing/components/motion-background";
import { ProductProofSection } from "@/features/landing/components/product-proof-section";

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
            <HowItWorksSection />
            <ProductProofSection />
          </div>
        </div>
      </main>
    </div>
  );
}
