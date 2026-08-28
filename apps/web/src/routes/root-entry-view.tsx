import { useEffect, useState } from "react";

import { CtxaroWordmark } from "@/features/brand/components/ctxaro-brand";
import { AppShell } from "@/layouts/app-shell";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { DashboardView } from "@/routes/dashboard-view";
import { LandingView } from "@/routes/landing-view";

export function RootEntryView() {
  const accessToken = useAuthSessionStore((state) => state.accessToken);
  const [hydrated, setHydrated] = useState(() => useAuthSessionStore.persist.hasHydrated());

  useEffect(() => {
    return useAuthSessionStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  if (!hydrated) {
    return <RootAuthLoading />;
  }

  if (!accessToken) {
    return <LandingView />;
  }

  return (
    <AppShell>
      <DashboardView />
    </AppShell>
  );
}

function RootAuthLoading() {
  return (
    <main className="dark grid min-h-screen place-items-center bg-[#050706] px-6 text-foreground">
      <section
        aria-labelledby="root-auth-loading-title"
        aria-live="polite"
        className="grid justify-items-center gap-5 text-center"
      >
        <CtxaroWordmark />
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Loading session
          </p>
          <h1 id="root-auth-loading-title" className="mt-3 text-2xl font-semibold text-white">
            Opening ctxaro...
          </h1>
        </div>
      </section>
    </main>
  );
}
