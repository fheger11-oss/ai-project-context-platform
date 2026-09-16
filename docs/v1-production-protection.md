# Ctxaro V1 Production Protection

These limits protect the V1 free workflow from uncontrolled storage growth and expensive concurrent processing. They are backend-enforced and can be changed later from the canonical usage-limit configuration.

## V1 Free Usage Limits

- Connected repositories: 1 per user
- Scans: 3 per UTC calendar month
- Analyses: 3 per UTC calendar month
- Project contexts: 3 per UTC calendar month
- Documents: 5 per UTC calendar month
- AI exports: 10 per UTC calendar month

Monthly usage is counted by UTC calendar month, from the first day of the month at 00:00 UTC to the first day of the next month at 00:00 UTC.

## Scan Limits

- Maximum files per scan: 1,000
- Maximum total scanned file size: 5 MiB
- Maximum individual non-binary file size: 512 KiB

The API remains the source of truth for scan limits through `GET /api/v1/scans/limits`.

## Retention

- Retain the latest 2 completed scans per repository.
- Older completed scans are deleted after a new scan completes successfully.
- Deleting a retained-out scan cascades through existing database relationships to remove its `ScanFile`, `Analysis`, `ProjectContext`, and `Document` records.
- Failed scan metadata is retained, but partial `ScanFile` rows are deleted when a scan fails.

## Concurrency

- Maximum heavy operations per user: 1
- Maximum active scans per repository: 1
- Maximum global active scans: 1
- Maximum active analyses per scan: 1
- Maximum global active analyses: 1

Heavy operations are scan, analysis, project context generation, and document generation. AI export is quota-limited but is not treated as a long-running heavy operation.

Concurrency is enforced with database-backed operation locks. Locks use unique operation keys and lease expirations so a crashed process does not permanently block future work.

The lock acquisition order for heavy operations is:

1. Global operation lock
2. User heavy-operation lock
3. Resource-specific lock

This order is used consistently to avoid deadlocks.
