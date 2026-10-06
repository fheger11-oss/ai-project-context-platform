import { ArrowLeft, House, RefreshCw, SearchX, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Link, isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";

import { StatePanel } from "@/components/shared/state-panel";
import { Button } from "@/components/ui/button";

export function RouteErrorView() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundView />;
  }

  return <UnexpectedErrorView />;
}

export function NotFoundView() {
  return (
    <ErrorPageFrame>
      <StatePanel
        action={
          <>
            <Button asChild>
              <Link to="/repositories">
                <House />
                Go to Dashboard
              </Link>
            </Button>
            <Button type="button" variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft />
              Go Back
            </Button>
          </>
        }
        description="The page you're looking for doesn't exist or may have been moved."
        icon={SearchX}
        title="Page not found"
        tone="empty"
      />
    </ErrorPageFrame>
  );
}

function UnexpectedErrorView() {
  const navigate = useNavigate();

  return (
    <ErrorPageFrame>
      <StatePanel
        action={
          <>
            <Button type="button" onClick={() => navigate(0)}>
              <RefreshCw />
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link to="/repositories">
                <House />
                Go to Dashboard
              </Link>
            </Button>
          </>
        }
        description="Something unexpected happened while loading this page. Please try again."
        icon={TriangleAlert}
        title="Something went wrong"
        tone="error"
      />
    </ErrorPageFrame>
  );
}

function ErrorPageFrame({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-xl">
        <div className="mb-5 text-center">
          <Link className="text-lg font-semibold tracking-tight text-foreground" to="/repositories">
            Ctxaro
          </Link>
        </div>
        {children}
      </div>
    </main>
  );
}
