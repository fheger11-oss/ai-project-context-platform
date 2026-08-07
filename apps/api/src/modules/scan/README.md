# Scan Engine

The Scan Engine owns repository snapshot management for the AI Project Context Platform.

## Current Sprint

Sprint 3.1.6.3 hardens repository access boundaries before scan lifecycle work begins.

## Current Capabilities

The engine is registered as a NestJS module, defines technology-neutral contracts, defines an application service boundary, binds `ScanRepository` to a Prisma persistence adapter, and binds `RepositoryContentProvider` to a GitHub content adapter. It defines the `RepositoryAccessResolver` contract but does not implement repository access resolution or execute scans.

## Responsibilities

- Define the module boundary for future repository snapshot management.
- Preserve clean application, domain, infrastructure, and presentation layers.
- Define contracts that keep future application services independent from persistence and content-provider implementations.
- Define `ScanService` as the future orchestration entry point for starting repository snapshots.
- Define `RepositoryAccessResolver` as the future boundary for resolving repository content access without coupling Scan application code to repository, authentication, or provider implementations.

## Contracts

- `ScanRepository` defines the storage capabilities required for repository snapshots without exposing Prisma.
- `RepositoryAccessResolver` defines how future application use cases request repository content access through an abstraction.
- `RepositoryContentProvider` defines repository content access through an opaque `RepositoryContentAccess` model.
- Future application code must depend on these abstractions, while infrastructure supplies implementations.

## Application Boundary

`ScanService.startScan` is the future application entry point. It depends on `ScanRepository`, `RepositoryContentProvider`, and `RepositoryAccessResolver` contracts only, so future infrastructure can be added without changing orchestration code. It is not registered as a NestJS provider until repository access resolution is implemented.

`RepositoryContentAccess` is intentionally opaque to the application layer. Concrete provider credentials and provider-specific repository addressing are interpreted only by infrastructure adapters.

## Infrastructure

`PrismaScanRepository` is the persistence adapter for `ScanRepository`. It maps Prisma records into domain types before returning data to the application layer.

`GitHubRepositoryContentProvider` is the content adapter for GitHub repositories. It maps GitHub tree metadata into Scan domain file metadata without downloading file contents.

## Out of Scope

- Repository traversal, provider implementations, persistence adapters, controllers, DTOs, services, background jobs, queues, and API endpoints.
- Authentication, repository management, code analysis, AI, documentation, context generation, dependency analysis, framework detection, and language detection.

## Planned Future Sprints

Future sprints may add snapshot domain concepts, application use cases, persistence, providers, and presentation adapters when those capabilities are explicitly scoped.
