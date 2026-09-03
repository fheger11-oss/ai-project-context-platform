import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { CtxaroWordmark } from "@/features/brand/components/ctxaro-brand";
import { getScanLimits, type ScanLimits } from "@/features/scans/api/scan-api";
import { formatBytes } from "@/features/scans/utils/scan-usage";

const LAST_UPDATED = "September 3, 2026";

const skippedFiles = [
  ".env",
  ".env.*",
  ".npmrc",
  ".pypirc",
  ".netrc",
  "credentials.json",
  "service-account.json",
  "id_rsa",
  "id_ed25519",
  "*.pem",
  "*.key",
  "*.p12",
  "*.pfx"
];

const documentTypes = [
  "Project Overview",
  "Technical Documentation",
  "Architecture Documentation",
  "Module Documentation",
  "README"
];

export function PrivacyView() {
  const [scanLimits, setScanLimits] = useState<ScanLimits | null>(null);

  useEffect(() => {
    let isMounted = true;

    getScanLimits()
      .then((limits) => {
        if (isMounted) {
          setScanLimits(limits);
        }
      })
      .catch(() => {
        if (isMounted) {
          setScanLimits(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="dark min-h-screen bg-[#050706] text-foreground">
      <header className="border-b border-white/[0.07] bg-[#050706]/88">
        <nav
          aria-label="Privacy navigation"
          className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050706]"
            aria-label="ctxaro home"
          >
            <CtxaroWordmark />
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link to="/">Back to ctxaro</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto grid max-w-4xl gap-10 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <section className="grid gap-4">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Privacy
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-white sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          <p className="max-w-3xl text-base leading-7 text-subtle-foreground">
            This policy describes the current Ctxaro MVP. It is written for transparency and still
            requires legal review before public launch.
          </p>
        </section>

        <PolicySection title="1. Scope">
          <p>
            Ctxaro is a developer tool that connects to GitHub repositories and turns repository
            information into structured Project Context, technical documentation, and AI-ready
            exports. This page describes what the current MVP collects, stores, processes, exposes,
            and deletes.
          </p>
        </PolicySection>

        <PolicySection title="2. Information Ctxaro Collects">
          <p>
            Ctxaro stores account information such as your user id, email address, optional password
            hash, role, GitHub identity, GitHub username, GitHub avatar URL, and timestamps.
          </p>
          <p>
            Ctxaro also stores repository metadata, scan metadata, eligible scanned source-file
            content, analysis results, Project Context snapshots, and generated documents for
            repositories you connect.
          </p>
        </PolicySection>

        <PolicySection title="3. GitHub Authentication">
          <p>
            Ctxaro uses GitHub OAuth and the GitHub API to authenticate users and access
            repositories according to granted permissions. The current MVP requests these GitHub
            scopes:
          </p>
          <ul>
            <li>
              <code>repo</code>
            </li>
            <li>
              <code>read:user</code>
            </li>
            <li>
              <code>user:email</code>
            </li>
          </ul>
          <p>
            The <code>repo</code> scope is broad, but it is used by the OAuth-based MVP to read
            private repositories when you choose to connect them. Narrower GitHub permissions are a
            future least-privilege improvement.
          </p>
        </PolicySection>

        <PolicySection title="4. Repository Data">
          <p>
            Repository metadata can include repository owner, name, full name, description, default
            branch, visibility, primary language, GitHub URLs, GitHub repository id, stars, forks,
            archive status, commit SHA, and synchronization timestamps.
          </p>
        </PolicySection>

        <PolicySection title="5. Source-Code Processing And Storage">
          <p>
            When you start a scan, Ctxaro fetches repository tree and file data from GitHub.
            Eligible non-binary file content may be stored in scan records while the repository
            remains connected. Binary files are not stored as raw binary content in the scan model.
          </p>
          <p>Current scan limits are:</p>
          {scanLimits ? (
            <ul>
              <li>Maximum {scanLimits.maxFiles.toLocaleString()} eligible files per scan</li>
              <li>
                Maximum {formatBytes(scanLimits.maxIndividualFileSizeBytes)} per individual
                non-binary file
              </li>
              <li>
                Maximum {formatBytes(scanLimits.maxTotalSizeBytes)} total eligible repository file
                data per scan
              </li>
            </ul>
          ) : (
            <p>Scan limit values are loaded from the scan API.</p>
          )}
          <p>
            Ctxaro skips obvious sensitive files such as {skippedFiles.join(", ")}. This is a
            conservative guardrail, not a complete secret detector. Full secret scanning and
            content-level redaction are not currently implemented.
          </p>
        </PolicySection>

        <PolicySection title="6. Analysis, Project Context, And Documents">
          <p>
            Repository data can be transformed into derived information such as project structure,
            technologies, dependencies, architecture signals, modules, entry points, claims,
            evidence, confidence, and other Project Context information.
          </p>
          <p>Current generated document types include:</p>
          <ul>
            {documentTypes.map((type) => (
              <li key={type}>{type}</li>
            ))}
          </ul>
        </PolicySection>

        <PolicySection title="7. AI Export">
          <p>
            AI Export currently serializes stored Project Context into AI_CONTEXT JSON, Markdown, or
            Plain Text. These exports are generated on demand and are not persisted as separate
            database records.
          </p>
          <p>
            Ctxaro does not currently send repository content to an external AI provider as part of
            this MVP export flow.
          </p>
        </PolicySection>

        <PolicySection title="8. Browser And Session Data">
          <p>
            The frontend currently persists Ctxaro access and refresh tokens in browser storage as
            an MVP tradeoff. Refresh tokens are hashed on the server. GitHub provider access tokens
            are not stored in browser storage.
          </p>
          <p>
            OAuth state uses a signed value and a temporary HttpOnly nonce cookie. The nonce cookie
            expires quickly and is cleared during callback handling.
          </p>
        </PolicySection>

        <PolicySection title="9. How Data Is Used">
          <p>
            Ctxaro uses stored data to authenticate users, maintain sessions, connect GitHub
            repositories, scan selected repositories, produce analysis, generate Project Context,
            generate documents, serve dashboard views, and create on-demand exports.
          </p>
        </PolicySection>

        <PolicySection title="10. Third-Party Infrastructure">
          <p>
            The current deployment targets are Vercel for the frontend, Railway for the API, and
            Supabase/PostgreSQL for the database. GitHub receives OAuth and repository API requests.
            Hosting-provider logs and database backups are controlled by provider configuration and
            must be reviewed before public launch.
          </p>
        </PolicySection>

        <PolicySection title="11. Retention">
          <p>
            Account data has no automatic application-level expiration. GitHub account and provider
            token data remains while the GitHub connection remains. Repository metadata, scan files,
            analysis results, Project Context, and documents remain while the repository remains
            connected.
          </p>
          <p>
            Refresh tokens have expiry and revocation behavior, but there is currently no scheduled
            purge job for expired token records. Logs and backups follow infrastructure-provider
            settings.
          </p>
        </PolicySection>

        <PolicySection title="12. Repository Disconnect">
          <p>
            Disconnecting a repository removes the repository record and repository-derived database
            records through cascade deletion, including scans, scan files, analyses, Project
            Context, and documents. Disconnecting one repository does not delete your Ctxaro account
            or your GitHub account connection.
          </p>
        </PolicySection>

        <PolicySection title="13. Account Deletion">
          <p>
            Self-service account deletion is not currently implemented in the MVP. Account deletion
            and related privacy requests require a manual process until a self-service flow exists.
          </p>
        </PolicySection>

        <PolicySection title="14. Security Measures">
          <p>
            Ctxaro enforces repository ownership on the server, encrypts GitHub provider tokens at
            rest, stores refresh tokens as server-side hashes, rotates refresh tokens, redacts query
            strings from request and exception paths, disables Swagger in production, and uses API
            rate limiting.
          </p>
          <p>
            Source-code scan content is not encrypted separately by the application. Database and
            backup protection depend on production infrastructure configuration.
          </p>
        </PolicySection>

        <PolicySection title="15. Privacy Requests">
          <p>
            You may request access, correction, deletion, or other handling of your data where
            applicable. A real production privacy contact mechanism is not configured in this
            repository yet and must be added before public launch. This section requires legal
            review.
          </p>
        </PolicySection>

        <PolicySection title="16. Contact">
          <p>
            Launch configuration required: publish a real privacy/contact channel before making this
            policy public. Do not use a placeholder email address for production.
          </p>
        </PolicySection>

        <PolicySection title="17. Changes To This Policy">
          <p>
            Ctxaro may update this policy as the product changes. The "Last updated" date will be
            changed when the policy changes. Material legal language requires legal review.
          </p>
        </PolicySection>
      </main>
    </div>
  );
}

function PolicySection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="grid gap-3 border-t border-white/10 pt-7">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="grid gap-3 text-sm leading-7 text-muted-foreground [&_code]:rounded [&_code]:border [&_code]:border-primary/20 [&_code]:bg-primary/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-primary [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </section>
  );
}
