export type CommitGenerationGuard = {
  capture: () => number;
  isCurrent: (generation: number) => boolean;
  invalidate: () => void;
};

/**
 * Invalidates snapshots that were queued before a rejected cloud commit.
 *
 * A queued snapshot is based on every local change that preceded it. If an
 * earlier commit is rejected, sending a later snapshot can silently reintroduce
 * the rejected change after hydration. One generation per healthy queue makes
 * every already-queued descendant a no-op after the first failure.
 */
export function createCommitGenerationGuard(): CommitGenerationGuard {
  let current = 0;
  return {
    capture: () => current,
    isCurrent: (generation) => generation === current,
    invalidate: () => {
      current = (current + 1) % Number.MAX_SAFE_INTEGER;
    },
  };
}
