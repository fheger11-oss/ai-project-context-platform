import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "@/layouts/app-shell";
import { AuthCallbackView } from "@/routes/auth-callback-view";
import { AnalysisResultView } from "@/routes/analyses/analysis-result-view";
import { ConnectRepositoryView } from "@/routes/repositories/connect-repository-view";
import { LandingView } from "@/routes/landing-view";
import { PrivacyView } from "@/routes/privacy-view";
import { RepositoryArchitectureHistoryView } from "@/routes/repositories/repository-architecture-history-view";
import { RepositoryArchitectureIntelligenceView } from "@/routes/repositories/repository-architecture-intelligence-view";
import { RepositoryDecisionsView } from "@/routes/repositories/repository-decisions-view";
import { RepositoryKnowledgeView } from "@/routes/repositories/repository-knowledge-view";
import { RepositoryDetailsView } from "@/routes/repositories/repository-details-view";
import { RepositoryListView } from "@/routes/repositories/repository-list-view";
import { RepositoryTimelineView } from "@/routes/repositories/repository-timeline-view";
import { RootEntryView } from "@/routes/root-entry-view";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootEntryView />
  },
  {
    path: "/landing",
    element: <LandingView />
  },
  {
    path: "/privacy",
    element: <PrivacyView />
  },
  {
    path: "/auth/callback",
    element: <AuthCallbackView />
  },
  {
    path: "/",
    element: <AppShell />,
    children: [
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
        path: "repositories/:id/decisions",
        element: <RepositoryDecisionsView />
      },
      {
        path: "repositories/:id/knowledge",
        element: <RepositoryKnowledgeView />
      },
      {
        path: "repositories/:id/timeline",
        element: <RepositoryTimelineView />
      },
      {
        path: "repositories/:id/architecture-intelligence",
        element: <RepositoryArchitectureIntelligenceView />
      },
      {
        path: "repositories/:id/architecture-history",
        element: <RepositoryArchitectureHistoryView />
      },
      {
        path: "analyses/:analysisId",
        element: <AnalysisResultView />
      }
    ]
  }
]);
