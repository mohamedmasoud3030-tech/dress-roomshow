/**
 * Server-acknowledgement channel for operational writes (UX-S2).
 *
 * The persistence-status channel (`persistenceStatus.ts`) answers "is the
 * showroom connected to its data?" and owns the offline/error banners. This
 * channel answers a narrower, calmer question: "did the money operation I
 * just finished actually reach the server?"
 *
 * Rules, all of which are asserted in `tests/cloud-save-ack.test.mjs`:
 *
 * 1. An acknowledgement is published ONLY after the authoritative command RPC
 *    returned a reconstructed snapshot and revision. A local-only write has no
 *    such return value, so this channel cannot fire for one by construction.
 * 2. The offline path owns its own banner; nothing is published from a catch.
 * 3. The copy is a fixed sentence with no figures in it — a toast that quoted
 *    an amount would invite the operator to read money off a 3-second popup.
 */

export const CLOUD_SAVE_ACK_EVENT = 'lena:cloud-save-ack';

/** Fixed sentence: no amount, no counter, no id. */
export const CLOUD_SAVE_ACK_MESSAGE = 'محفوظ على الخادم ✓';

/** Well under the 4 s ceiling the UX roadmap sets for a quiet acknowledgement. */
export const CLOUD_SAVE_ACK_DISMISS_MS = 3_500;

export type CloudSaveAck = {
  commandName: string;
  /** Server-assigned revision proving the write was accepted, not merely sent. */
  revision: number;
  at: string;
};

/**
 * Command families whose result is money: cash movement, a settled liability,
 * a recognised charge, or the close that freezes the day's figures.
 *
 * Kept as an explicit list rather than "every command" on purpose — an
 * acknowledgement on every inventory edit or reminder dismissal would train
 * the operator to ignore it, which is worse than not showing it.
 */
const MONEY_TOUCHING_PREFIXES: readonly string[] = [
  'payment.',
  'expense.',
  'sale.',
  'reservation.',
  'daily-close.',
];

const MONEY_TOUCHING_COMMANDS: ReadonlySet<string> = new Set([
  'delivery.complete',
  'return.complete',
  'accessory.attach',
  'accessory.detach',
  'service.complete',
]);

export function isMoneyTouchingCommand(commandName: string): boolean {
  if (typeof commandName !== 'string' || commandName.length === 0) return false;
  if (MONEY_TOUCHING_COMMANDS.has(commandName)) return true;
  return MONEY_TOUCHING_PREFIXES.some((prefix) => commandName.startsWith(prefix));
}

/**
 * Announces a confirmed server write. Returns `true` only when an event was
 * actually dispatched, so callers and tests can tell a published acknowledgement
 * from a filtered one without listening for anything.
 */
export function publishCloudSaveAck(commandName: string, revision: number): boolean {
  if (!isMoneyTouchingCommand(commandName)) return false;
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return false;
  if (!Number.isFinite(revision)) return false;

  const detail: CloudSaveAck = { commandName, revision, at: new Date().toISOString() };
  window.dispatchEvent(new CustomEvent<CloudSaveAck>(CLOUD_SAVE_ACK_EVENT, { detail }));
  return true;
}

/** Structural guard so a consumer never has to trust an untyped event payload. */
export function isCloudSaveAck(value: unknown): value is CloudSaveAck {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.commandName === 'string'
    && typeof candidate.revision === 'number'
    && typeof candidate.at === 'string'
  );
}
