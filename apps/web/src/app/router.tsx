import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "@/layouts/app-shell";
import { FoundationView } from "@/routes/foundation-view";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <FoundationView />
      }
    ]
  }
]);
