import { AppShell } from "@/layouts/app-shell";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { DashboardView } from "@/routes/dashboard-view";
import { LandingView } from "@/routes/landing-view";

export function RootEntryView() {
  const accessToken = useAuthSessionStore((state) => state.accessToken);

  if (!accessToken) {
    return <LandingView />;
  }

  return (
    <AppShell>
      <DashboardView />
    </AppShell>
  );
}
