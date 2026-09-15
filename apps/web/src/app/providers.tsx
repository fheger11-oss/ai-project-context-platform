import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { AnalyticsProvider } from "@/lib/analytics-provider";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider } from "@/providers/theme-provider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
