import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "@/layouts/app-shell";
import { AuthCallbackView } from "@/routes/auth-callback-view";
import { DashboardView } from "@/routes/dashboard-view";
import { AnalysisResultView } from "@/routes/analyses/analysis-result-view";
import { ConnectRepositoryView } from "@/routes/repositories/connect-repository-view";
import { RepositoryDetailsView } from "@/routes/repositories/repository-details-view";
import { RepositoryListView } from "@/routes/repositories/repository-list-view";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <DashboardView />
      },
      {
        path: "auth/callback",
        element: <AuthCallbackView />
      },
      {
        path: "repositories",
        element: <RepositoryListView />
      },
      {
        path: "repositories/connect",
        element: <ConnectRepositoryView />
      },
      {
        path: "repositories/:id",
        element: <RepositoryDetailsView />
      },
      {
        path: "analyses/:analysisId",
        element: <AnalysisResultView />
      }
    ]
  }
]);
