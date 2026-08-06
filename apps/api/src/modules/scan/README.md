# Scan Engine

The Scan Engine owns repository snapshot management for the AI Project Context Platform.

## Current Sprint

Sprint 3.1.6.1 refines provider authentication through runtime repository access.

## Current Capabilities

The engine is registered as a NestJS module, defines technology-neutral contracts, exposes an application service boundary, binds `ScanRepository` to a Prisma persistence adapter, and binds `RepositoryContentProvider` to a GitHub content adapter. It does not execute scans.

## Responsibilities

- Define the module boundary for future repository snapshot management.
- Preserve clean application, domain, infrastructure, and presentation layers.
- Define contracts that keep future application services independent from persistence and content-provider implementations.
- Define `ScanService` as the future orchestration entry point for starting repository snapshots.

## Contracts

- `ScanRepository` defines the storage capabilities required for repository snapshots without exposing Prisma.
- `RepositoryContentProvider` defines repository content access through provider-neutral runtime `RepositoryAccess`.
- Future application code must depend on these abstractions, while infrastructure supplies implementations.

## Application Boundary

`ScanService.startScan` is the only application entry point. It depends on `ScanRepository` and `RepositoryContentProvider` contracts only, so future infrastructure can be added without changing orchestration code.

`RepositoryAccess` identifies repository content by provider, owner, name, optional reference, and runtime access token. It does not expose internal database IDs or provider SDK details, and it is never persisted by the Scan Engine.

## Infrastructure

`PrismaScanRepository` is the persistence adapter for `ScanRepository`. It maps Prisma records into domain types before returning data to the application layer.

`GitHubRepositoryContentProvider` is the content adapter for GitHub repositories. It maps GitHub tree metadata into Scan domain file metadata without downloading file contents.

## Out of Scope

- Repository traversal, provider implementations, persistence adapters, controllers, DTOs, services, background jobs, queues, and API endpoints.
- Authentication, repository management, code analysis, AI, documentation, context generation, dependency analysis, framework detection, and language detection.

## Planned Future Sprints

Future sprints may add snapshot domain concepts, application use cases, persistence, providers, and presentation adapters when those capabilities are explicitly scoped.
