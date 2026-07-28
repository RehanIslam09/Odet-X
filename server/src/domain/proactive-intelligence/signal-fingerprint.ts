import crypto from "crypto";

/**
 * Pure SHA-256 fingerprint generator for deterministic signal deduplication.
 *
 * Guarantees:
 * 1. Outputs a 64-character lowercase hexadecimal string matching `/^[a-f0-9]{64}$/`.
 * 2. Pure function with zero side effects, zero DB dependencies, and zero randomness.
 * 3. Array elements (such as task IDs) are normalized before hashing to guarantee
 *    reproducibility regardless of input order.
 */

/**
 * Generates a SHA-256 fingerprint hex string for an OVERDUE_HIGH_PRIORITY_TASKS signal.
 */
export function generateOverdueSignalFingerprint(projectId: string, taskIds: string[]): string {
  const sortedTaskIds = [...taskIds].sort();
  const rawInput = `OVERDUE_HIGH_PRIORITY_TASKS:${projectId}:${sortedTaskIds.join(",")}`;
  return crypto.createHash("sha256").update(rawInput).digest("hex").toLowerCase();
}

/**
 * Generates a SHA-256 fingerprint hex string for a MILESTONE_AT_RISK signal.
 */
export function generateMilestoneRiskFingerprint(
  milestoneId: string,
  targetDateIso: string,
  incompleteTaskIds: string[],
): string {
  const sortedTaskIds = [...incompleteTaskIds].sort();
  const rawInput = `MILESTONE_AT_RISK:${milestoneId}:${targetDateIso}:${sortedTaskIds.join(",")}`;
  return crypto.createHash("sha256").update(rawInput).digest("hex").toLowerCase();
}

/**
 * Generates a SHA-256 fingerprint hex string for a DEPENDENCY_BOTTLENECK signal.
 */
export function generateDependencyBottleneckFingerprint(
  blockingTaskId: string,
  downstreamTaskIds: string[],
): string {
  const sortedTaskIds = [...downstreamTaskIds].sort();
  const rawInput = `DEPENDENCY_BOTTLENECK:${blockingTaskId}:${sortedTaskIds.join(",")}`;
  return crypto.createHash("sha256").update(rawInput).digest("hex").toLowerCase();
}

/**
 * Generates a SHA-256 fingerprint hex string for a PROJECT_STALLED signal.
 * Uses weekly time buckets (Math.floor(stalledDays / 7)) to stabilize fingerprints.
 */
export function generateProjectStalledFingerprint(projectId: string, stalledDays: number): string {
  const weeklyBucket = Math.floor(stalledDays / 7);
  const rawInput = `PROJECT_STALLED:${projectId}:${weeklyBucket}`;
  return crypto.createHash("sha256").update(rawInput).digest("hex").toLowerCase();
}
