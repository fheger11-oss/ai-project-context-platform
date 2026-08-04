import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "@/layouts/app-shell";
import { FoundationView } from "@/routes/foundation-view";
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
        element: <FoundationView />
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
      }
    ]
  }
]);
