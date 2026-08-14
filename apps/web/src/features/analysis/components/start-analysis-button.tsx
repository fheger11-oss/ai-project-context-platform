import { BarChart3, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { AnalysisApiRequestError, startAnalysis } from "@/features/analysis/api/analysis-api";

type StartAnalysisButtonProps = {
  accessToken: string;
  scanId: string;
};

function startAnalysisErrorMessage(error: unknown): string {
  if (error instanceof AnalysisApiRequestError) {
    if (error.status === 400) {
      return "This scan is not ready for analysis.";
    }

    if (error.status === 401) {
      return "Sign in again to start analysis.";
    }

    if (error.status === 403) {
      return "You do not have access to analyze this scan.";
    }

    if (error.status === 404) {
      return "This scan is no longer available.";
    }

    return "Analysis could not be started.";
  }

  return "Network problem. Check your connection and try again.";
}

export function StartAnalysisButton({ accessToken, scanId }: StartAnalysisButtonProps) {
  const navigate = useNavigate();
  const analysisMutation = useMutation({
    mutationFn: () => startAnalysis(accessToken, scanId),
    onSuccess: (result) => {
      void navigate(`/analyses/${encodeURIComponent(result.analysisId)}`);
    }
  });
  const feedbackId = `analysis-feedback-${scanId}`;

  function handleStartAnalysis() {
    if (!accessToken || analysisMutation.isPending) {
      return;
    }

    analysisMutation.mutate();
  }

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!accessToken || analysisMutation.isPending}
        aria-busy={analysisMutation.isPending}
        aria-describedby={feedbackId}
        onClick={handleStartAnalysis}
      >
        {analysisMutation.isPending ? <Loader2 /> : <BarChart3 />}
        {analysisMutation.isPending ? "Analyzing" : "Analyze Scan"}
      </Button>

      <div id={feedbackId} aria-live="polite">
        {analysisMutation.isPending ? (
          <p className="text-xs text-muted-foreground" role="status">
            Analysis is running.
          </p>
        ) : null}

        {analysisMutation.isError ? (
          <p className="text-xs text-destructive" role="alert">
            {startAnalysisErrorMessage(analysisMutation.error)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
