# Scan Infrastructure Layer

External providers, persistence adapters, and integration details for repository snapshot management belong here.

`PrismaScanRepository` implements the Scan persistence contract and keeps Prisma-specific mapping inside infrastructure.

`GitHubRepositoryContentProvider` implements repository content access for GitHub and keeps GitHub-specific responses inside infrastructure.
