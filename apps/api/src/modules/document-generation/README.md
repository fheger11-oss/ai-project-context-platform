# Document Generation Engine

Sprint 6.1 establishes the Document Generation Engine domain foundation and contracts.

The engine consumes structured `ProjectContext` and produces immutable human-readable document
artifacts. It does not read repositories, re-run scan or analysis behavior, render Markdown, call
providers, persist documents, or expose HTTP endpoints in this sprint.
