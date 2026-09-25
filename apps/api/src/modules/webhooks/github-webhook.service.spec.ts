import { BadRequestException, Logger, UnauthorizedException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GitHubWebhookService } from "./github-webhook.service.js";

const sha = "a".repeat(40);
const payload = Buffer.from(
  JSON.stringify({
    ref: "refs/heads/main",
    after: sha,
    repository: { id: 123, full_name: "ctxaro/api" }
  })
);
function harness() {
  const verify = vi.fn();
  const findConnectedRepositories = vi.fn(async () => [
    { id: "repo_1", fullName: "Ctxaro/API", defaultBranch: "main" }
  ]);
  const accept = vi.fn(async () => ({ duplicate: false, dispatchCount: 1 }));
  return {
    service: new GitHubWebhookService(
      { verify } as never,
      { findConnectedRepositories, accept } as never
    ),
    verify,
    findConnectedRepositories,
    accept
  };
}

describe("GitHubWebhookService", () => {
  beforeEach(() => vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined));
  it("verifies then durably accepts a default-branch push", async () => {
    const h = harness();
    await expect(h.service.receive(payload, "sig", "push", "delivery-1")).resolves.toEqual({
      accepted: true,
      duplicate: false,
      outcome: "ACCEPTED"
    });
    expect(h.verify).toHaveBeenCalledWith(payload, "sig");
    expect(h.accept).toHaveBeenCalledWith(
      expect.objectContaining({ repositoryIds: ["repo_1"], targetCommitSha: sha })
    );
  });
  it("returns a safe successful duplicate acknowledgement", async () => {
    const h = harness();
    h.accept.mockResolvedValue({ duplicate: true, dispatchCount: 1 });
    await expect(h.service.receive(payload, "sig", "push", "delivery-1")).resolves.toMatchObject({
      accepted: true,
      duplicate: true
    });
  });
  it("does not persist non-default branches", async () => {
    const h = harness();
    h.findConnectedRepositories.mockResolvedValue([
      { id: "repo_1", fullName: "ctxaro/api", defaultBranch: "trunk" }
    ]);
    await expect(h.service.receive(payload, "sig", "push", "delivery-1")).resolves.toMatchObject({
      outcome: "IGNORED_NON_DEFAULT_BRANCH"
    });
    expect(h.accept).not.toHaveBeenCalled();
  });
  it("does not persist unknown repositories", async () => {
    const h = harness();
    h.findConnectedRepositories.mockResolvedValue([]);
    await expect(h.service.receive(payload, "sig", "push", "delivery-1")).resolves.toMatchObject({
      outcome: "IGNORED_UNKNOWN_REPOSITORY"
    });
  });
  it("rejects a full-name mismatch for a known provider repository ID", async () => {
    const h = harness();
    h.findConnectedRepositories.mockResolvedValue([
      { id: "repo_1", fullName: "other/repository", defaultBranch: "main" }
    ]);
    await expect(h.service.receive(payload, "sig", "push", "delivery-1")).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(h.accept).not.toHaveBeenCalled();
  });
  it("ignores branch deletions", async () => {
    const h = harness();
    const deleted = Buffer.from(
      JSON.stringify({
        ref: "refs/heads/main",
        after: "0".repeat(40),
        repository: { id: 123, full_name: "ctxaro/api" }
      })
    );
    await expect(h.service.receive(deleted, "sig", "push", "delivery-1")).resolves.toMatchObject({
      outcome: "IGNORED_DELETION"
    });
    expect(h.findConnectedRepositories).not.toHaveBeenCalled();
  });
  it.each([
    Buffer.from("{"),
    Buffer.from(
      JSON.stringify({ ref: "bad", after: sha, repository: { id: 123, full_name: "ctxaro/api" } })
    )
  ])("rejects malformed pushes", async (body) => {
    await expect(
      harness().service.receive(body, "sig", "push", "delivery-1")
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it("verifies the signature before parsing JSON", async () => {
    const h = harness();
    h.verify.mockImplementation(() => {
      throw new UnauthorizedException();
    });
    await expect(
      h.service.receive(Buffer.from("{"), "bad", "push", "delivery-1")
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it.each([undefined, "", "bad delivery!", "x".repeat(129)])(
    "rejects invalid delivery IDs",
    async (delivery) => {
      await expect(
        harness().service.receive(payload, "sig", "push", delivery)
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  );
});
