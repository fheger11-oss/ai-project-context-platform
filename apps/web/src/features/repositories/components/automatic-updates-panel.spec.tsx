import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { RepositoryAutomationStatus } from "@ai-context/contracts";

import { AutomaticUpdatesPanel } from "./automatic-updates-panel";

type AutomaticUpdates = RepositoryAutomationStatus["automaticUpdates"];

const baseStatus: AutomaticUpdates = {
  capability: "CAN_MANAGE_WEBHOOK",
  configuration: "NOT_CONFIGURED",
  enabled: false,
  lastOutcome: null,
  lastVerifiedAt: null
};

function renderStatus(automaticUpdates: Partial<AutomaticUpdates>) {
  return renderToStaticMarkup(
    <AutomaticUpdatesPanel
      error={null}
      isLoading={false}
      isReconciling={false}
      isRetryingStatus={false}
      onReconcile={vi.fn()}
      onRetryStatus={vi.fn()}
      reconcileError={null}
      status={{ automaticUpdates: { ...baseStatus, ...automaticUpdates } }}
    />
  );
}

describe("AutomaticUpdatesPanel", () => {
  it("renders Enabled only when the backend enabled flag is true", () => {
    const enabled = renderStatus({ configuration: "ENABLED", enabled: true });
    const inconsistent = renderStatus({ configuration: "ENABLED", enabled: false });

    expect(enabled).toContain(">Enabled<");
    expect(enabled).toContain(
      "Your repository is automatically updated when changes are pushed to GitHub."
    );
    expect(inconsistent).not.toContain(">Enabled<");
    expect(inconsistent).toContain("Not enabled");
  });

  it.each([
    ["REQUIRES_ADMIN", "Admin approval required", "administrator access"],
    ["REQUIRES_AUTHORIZATION", "GitHub authorization required", "Reconnect your GitHub account"],
    ["UNAVAILABLE", "Temporarily unavailable", "Automatic updates are temporarily unavailable"],
    ["FAILED", "Setup failed", "couldn&#x27;t enable automatic updates"],
    ["CLEANUP_PENDING", "Cleanup pending", "Cleanup is pending"],
    ["NOT_CONFIGURED", "Not configured", "not currently configured"],
    ["PROVISIONING", "Provisioning", "is configuring automatic updates"]
  ] as const)("renders the %s configuration", (configuration, label, description) => {
    const markup = renderStatus({ configuration });

    expect(markup).toContain(label);
    expect(markup).toContain(description);
    expect(markup).not.toContain(">Enabled<");
  });

  it.each([
    ["CANNOT_MANAGE_WEBHOOK", "Admin approval required", "administrator access"],
    ["PROVIDER_ACCESS_DENIED", "GitHub access unavailable", "unavailable or has been denied"],
    ["PROVIDER_REPOSITORY_NOT_FOUND", "Repository unavailable", "could not be found"],
    [
      "PROVIDER_AUTHORIZATION_REQUIRED",
      "GitHub authorization required",
      "Reconnect your GitHub account"
    ],
    ["PROVIDER_UNAVAILABLE", "Temporarily unavailable", "GitHub is temporarily unavailable"]
  ] as const)("renders the %s capability", (capability, label, description) => {
    const markup = renderStatus({ capability });

    expect(markup).toContain(label);
    expect(markup).toContain(description);
    expect(markup).not.toContain(">Enabled<");
  });

  it("does not expose backend or provider errors", () => {
    const markup = renderToStaticMarkup(
      <AutomaticUpdatesPanel
        error={new Error("raw provider secret failure")}
        isLoading={false}
        isReconciling={false}
        isRetryingStatus={false}
        onReconcile={vi.fn()}
        onRetryStatus={vi.fn()}
        reconcileError={null}
        status={undefined}
      />
    );

    expect(markup).toContain("Automatic updates unavailable");
    expect(markup).not.toContain("raw provider secret failure");
  });

  it("shows non-final loading and reconcile-pending states", () => {
    const loading = renderToStaticMarkup(
      <AutomaticUpdatesPanel
        error={null}
        isLoading
        isReconciling={false}
        isRetryingStatus={false}
        onReconcile={vi.fn()}
        onRetryStatus={vi.fn()}
        reconcileError={null}
        status={undefined}
      />
    );
    const pending = renderToStaticMarkup(
      <AutomaticUpdatesPanel
        error={null}
        isLoading={false}
        isReconciling
        isRetryingStatus={false}
        onReconcile={vi.fn()}
        onRetryStatus={vi.fn()}
        reconcileError={null}
        status={{ automaticUpdates: baseStatus }}
      />
    );

    expect(loading).toContain("Checking automatic updates");
    expect(pending).toContain("Rechecking");
    expect(pending).toContain("disabled");
    expect(pending).not.toContain(">Enabled<");
  });
});
