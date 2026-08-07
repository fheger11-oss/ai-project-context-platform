# Scan Domain Layer

Core business concepts, domain rules, and contracts for repository snapshot management belong here.

Contracts in this layer describe Scan Engine capabilities without depending on Prisma, GitHub, HTTP, or external SDKs.

Repository content access is represented through an opaque contract model and resolved through `RepositoryAccessResolver`.
