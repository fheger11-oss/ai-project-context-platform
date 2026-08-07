# Scan Engine

The Scan Engine owns repository snapshot management for the AI Project Context Platform.

## Current Sprint

Sprint 3.2.3 completes repository snapshots after file metadata persistence.

## Current Capabilities

The engine is registered as a NestJS module, defines technology-neutral contracts, defines an application service boundary, binds `ScanRepository` to a Prisma persistence adapter, binds `RepositoryContentProvider` to a GitHub content adapter, and binds `RepositoryAccessResolver` to an infrastructure adapter. It can initialize a scan, persist repository file metadata in batches, complete the snapshot with totals and duration, and expose the start operation through HTTP.

## Responsibilities

- Define the module boundary for future repository snapshot management.
- Preserve clean application, domain, infrastructure, and presentation layers.
- Define contracts that keep future application services independent from persistence and content-provider implementations.
- Define `ScanService` as the orchestration entry point for starting repository snapshots.
- Resolve repository content access through a Scan infrastructure adapter without coupling Scan application code to repository, authentication, or provider implementations.
- Persist repository snapshot file metadata without buffering the full repository in memory.
- Complete repository snapshots with `totalFiles`, `totalSize`, `durationMs`, and `completedAt`.
- Expose a minimal HTTP entry point for starting a scan.

## Contracts

- `ScanRepository` defines the storage capabilities required for repository snapshots without exposing Prisma.
- `RepositoryAccessResolver` defines how application use cases request repository content access through an abstraction.
- `RepositoryContentProvider` defines repository content access through an opaque `RepositoryContentAccess` model.
- Future application code must depend on these abstractions, while infrastructure supplies implementations.

## Application Boundary

`ScanService.startScan` is the application entry point. It depends on `ScanRepository`, `RepositoryContentProvider`, and `RepositoryAccessResolver` contracts only, so future infrastructure can be added without changing orchestration code. It initializes a scan, marks it running, streams repository file metadata, persists files in batches, and marks the snapshot completed after successful persistence.

`RepositoryContentAccess` is intentionally opaque to the application layer. Concrete provider credentials and provider-specific repository addressing are interpreted only by infrastructure adapters.

## Presentation

`ScanController` exposes `POST /api/v1/scans/start`. The controller validates the request, calls `ScanService.startScan`, and returns the resulting `ScanSnapshot` without reshaping it.

## Infrastructure

`PrismaScanRepository` is the persistence adapter for `ScanRepository`. It maps Prisma records into domain types before returning data to the application layer.

`GitHubRepositoryContentProvider` is the content adapter for GitHub repositories. It maps GitHub tree metadata into Scan domain file metadata without downloading file contents.

`RepositoryAccessResolverInfrastructure` resolves repository metadata through the Repository Engine and provider credentials through `GitHubAccountService`. Token decryption remains owned by the Authentication Engine.

## Out of Scope

- Repository traversal, provider implementations, persistence adapters, background jobs, queues, and additional API endpoints.
- Duplicate detection, retries, queues, workers, API endpoints, authentication, repository management, code analysis, AI, documentation, context generation, dependency analysis, framework detection, and language detection.

## Planned Future Sprints

Future sprints may add snapshot domain concepts, application use cases, persistence, providers, and presentation adapters when those capabilities are explicitly scoped.
