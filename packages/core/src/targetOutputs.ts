import type { Target } from "./types.ts";

export function isTarget(value: unknown): value is Target {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "taskList" in value &&
    Array.isArray((value as Target).taskList)
  );
}

/**
 * Collect declared output paths from all tasks in a target.
 * Used when resolving output references (e.g. lib:jar on a JVM classpath).
 */
export function collectTargetOutputs(target: Target): string[] {
  const outputs = new Set<string>();
  for (const task of target.taskList) {
    for (const output of task.normalizeOutputs()) {
      outputs.add(output);
    }
  }
  return [...outputs];
}
