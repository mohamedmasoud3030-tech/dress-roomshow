/**
 * The shared outcome contract for every settings action (data export, server-copy
 * download/restore, backup import).
 *
 * Four handlers used to restate it by hand, which is both what made this file's
 * duplication measurable and what would let a future edit change one handler's
 * error behaviour without the others noticing. It lives here, outside the
 * component, so the contract is executable in a test instead of only readable in
 * a diff.
 *
 * `action` resolves to the success message, or to `null` when the operator
 * cancelled: a cancel must leave the screen exactly as it was — no message, and
 * no stale error cleared either.
 */
export type SettingsActionReporters = {
  /** React state setter for the success line; `null` clears it. */
  setFeedback: (message: string | null) => void;
  setError: (error: unknown) => void;
};

export async function runGuardedSettingsAction(
  reporters: SettingsActionReporters,
  action: () => Promise<string | null>,
  onSettled?: () => void,
): Promise<void> {
  try {
    const message = await action();
    if (message === null) return;
    reporters.setFeedback(message);
    reporters.setError(null);
  } catch (reason: unknown) {
    reporters.setError(reason);
    reporters.setFeedback(null);
  } finally {
    onSettled?.();
  }
}
