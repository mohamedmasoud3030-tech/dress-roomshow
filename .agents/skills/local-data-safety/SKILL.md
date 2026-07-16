---
name: local-data-safety
description: Protect LENA's local-first data across browser storage, IndexedDB images, migrations, backup/restore, reset, Tauri snapshots, and atomic commands.
---

# Local Data Safety

## Use this skill when

A task touches localStorage, `localDatabase`, IndexedDB, images, schema versions, migrations, imports, exports, reset, demo data, Tauri persistence, identifiers, or any command that writes multiple collections.

## Data contract

- One canonical persistence adapter owns all operational collections.
- Every operational collection is registered for backup, restore, reset, integrity checks, and Tauri snapshots where applicable.
- Image blobs are part of the data set and must survive export/import and rollback.
- Legacy keys are migrated deliberately; they are not left as silent alternate sources of truth.
- IDs are immutable. Human-facing codes are unique, monotonic or collision-safe, and never reused after deletion/archive.
- Production first run contains no implicit mock records.

## Change method

1. Inventory every affected collection, storage key, image store, schema version, and desktop mirror path.
2. Define the before/after schema and an idempotent migration before changing readers or writers.
3. Take or preserve an exact pre-operation snapshot for any destructive import, migration, reset, or multi-collection command.
4. Commit all related writes atomically. When the platform cannot provide a transaction, implement exact compensation rollback.
5. Make interrupted operations detectable and safely retryable.
6. Keep browser/PWA and Tauri behavior equivalent unless the product contract explicitly documents a difference.
7. Remove legacy reads only after migration and compatibility tests prove the new source is authoritative.

## Mandatory tests

- empty first run;
- legacy-key migration with real representative data;
- migration rerun/idempotency;
- duplicate and collision handling;
- backup/export then reset then restore round trip;
- image blob round trip and checksum/count verification;
- malformed or partial import rejection without data loss;
- forced failure after every write boundary with exact previous-state restoration;
- browser/PWA relaunch and Tauri relaunch persistence;
- reset removes all registered operational data and images, without deleting unrelated application data.

## Prohibited shortcuts

- Direct feature-specific localStorage keys outside the canonical adapter.
- Updating collection data without updating the registry and backup contract.
- Calling sequential writes atomic because each individual write succeeded.
- Deleting old data before the replacement has been verified.
- Treating `tauri -- info` as proof that desktop persistence or packaging works.

## Completion rule

A persistence change is complete only when migration, rollback, backup/restore, reset, browser/PWA relaunch, and Tauri relaunch are verified with the same business records and image assets.
