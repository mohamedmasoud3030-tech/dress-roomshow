import type { LocalDatabaseBackup } from '@engines/persistence';

/**
 * Patch-only cloud write format.
 *
 * The old RPC accepted a full client-authored snapshot, which made every
 * browser an authority over every collection. A command now sends only entity
 * upserts/deletes derived from one local workflow. PostgreSQL rebuilds the
 * candidate from its current authoritative snapshot and rejects combinations
 * outside that command's allowed surface.
 */
export type ShowroomCommandPatch = {
  upserts?: Record<string, unknown[]>;
  deletes?: Record<string, string[]>;
  /**
   * A few owner-only settings collections have one object without an entity ID.
   * PostgreSQL permits replacements only for their named administrative command.
   */
  replacements?: Record<string, unknown[]>;
};

const SERVER_OWNED_COLLECTIONS = new Set(['audit-log', 'audit', 'command-log']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function entityId(value: unknown): string | null {
  return isRecord(value) && typeof value.id === 'string' && value.id.trim() ? value.id : null;
}

/** Stable enough for JSON persistence records; object key ordering is normalised. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (!isRecord(value)) return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
}

function collections(snapshot: LocalDatabaseBackup): Record<string, unknown[]> {
  return snapshot.collections ?? {};
}

/** True when every element has the immutable entity ID required by an upsert patch. */
function hasEntityIds(items: unknown[]): boolean {
  return items.every((item) => entityId(item) !== null);
}

/**
 * Diffs only collections. Metadata/export timestamps and image blobs are not a
 * cloud authority surface; server-owned audit/command logs are intentionally
 * omitted so PostgreSQL can create actor-bound records itself.
 */
export function buildShowroomCommandPatch(
  before: LocalDatabaseBackup,
  after: LocalDatabaseBackup,
): ShowroomCommandPatch {
  const upserts: Record<string, unknown[]> = {};
  const deletes: Record<string, string[]> = {};
  const replacements: Record<string, unknown[]> = {};
  const names = new Set([...Object.keys(collections(before)), ...Object.keys(collections(after))]);

  for (const name of names) {
    if (SERVER_OWNED_COLLECTIONS.has(name)) continue;

    const previous = collections(before)[name] ?? [];
    const next = collections(after)[name] ?? [];
    if (stableJson(previous) === stableJson(next)) continue;

    if (!hasEntityIds(previous) || !hasEntityIds(next)) {
      replacements[name] = structuredClone(next);
      continue;
    }

    const previousById = new Map(previous.map((item) => [entityId(item)!, item]));
    const nextById = new Map(next.map((item) => [entityId(item)!, item]));
    const collectionUpserts: unknown[] = [];
    const collectionDeletes: string[] = [];

    for (const [id, value] of nextById) {
      if (stableJson(previousById.get(id)) !== stableJson(value)) {
        collectionUpserts.push(structuredClone(value));
      }
    }
    for (const id of previousById.keys()) {
      if (!nextById.has(id)) collectionDeletes.push(id);
    }

    if (collectionUpserts.length > 0) upserts[name] = collectionUpserts;
    if (collectionDeletes.length > 0) deletes[name] = collectionDeletes;
  }

  const patch: ShowroomCommandPatch = {};
  if (Object.keys(upserts).length > 0) patch.upserts = upserts;
  if (Object.keys(deletes).length > 0) patch.deletes = deletes;
  if (Object.keys(replacements).length > 0) patch.replacements = replacements;
  return patch;
}

export function patchHasChanges(patch: ShowroomCommandPatch): boolean {
  return Boolean(
    Object.values(patch.upserts ?? {}).some((items) => items.length > 0)
    || Object.values(patch.deletes ?? {}).some((items) => items.length > 0)
    || Object.keys(patch.replacements ?? {}).length > 0,
  );
}
