# Analysis Engine

Sprint 4.1 established the Analysis Engine foundation and contracts.
Sprint 4.2 adds the runtime boundary for consuming completed Scan snapshots through the
Analysis-side `ScanContentReader` contract.

The engine owns deterministic structural understanding of completed scan snapshots. It does not
perform parsing, persistence, HTTP presentation, GitHub access, or credential handling in this
sprint.
