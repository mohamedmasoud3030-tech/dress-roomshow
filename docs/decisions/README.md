# Dress Roomshow Decision Register

Use this directory for durable product and architecture decisions.

## Active decisions

### ADR-001 — Single-showroom operation

The application serves one local dress showroom. Do not add multi-showroom SaaS behavior unless a later approved decision explicitly changes this boundary.

### ADR-002 — Local-first persistence

The web and PWA builds use browser-local storage. The Tauri build persists local snapshots in SQLite. Cloud synchronization is deferred.

### ADR-003 — Preserve operational history

Reservation, delivery, return, penalty, settlement, daily-closing, and restore behavior must remain auditable. Corrections preserve history rather than silently rewriting past operations.

### ADR-004 — Storage changes require backward awareness

Existing local records may already exist on customer devices. Storage migrations, snapshot changes, and restore logic must remain versioned and backward-aware.

## Adding a decision

Add a short ADR file when changing a durable boundary. State the context, decision, consequences, and explicit exclusions. Link it from this index.