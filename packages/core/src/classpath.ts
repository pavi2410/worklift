import type { Target } from "./types.ts";
import { Artifact } from "./Artifact.ts";
import { FileSet } from "./FileSet.ts";
import type { Task } from "./Task.ts";

export type ClasspathElement =
  | string
  | string[]
  | Artifact<string[]>
  | FileSet
  | Target;

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

/**
 * Register artifact consumers and target output file inputs from classpath elements.
 */
export function registerClasspathElements(
  task: Task,
  elements: ClasspathElement[]
): void {
  for (const element of elements) {
    if (Array.isArray(element) || typeof element === "string") {
      continue;
    }
    if (element instanceof Artifact) {
      task.registerArtifactConsumer(element);
    } else if (isTarget(element)) {
      task.registerClasspathTargetDependency(element);
      task.registerFileInputs(collectTargetOutputs(element));
    }
  }
}

/**
 * Resolve classpath elements to filesystem paths at execution time.
 */
export async function resolveClasspathPaths(
  task: Task,
  elements: ClasspathElement[]
): Promise<string[]> {
  const resolved: string[] = [];

  for (const element of elements) {
    if (typeof element === "string") {
      resolved.push(element);
    } else if (Array.isArray(element)) {
      resolved.push(...element);
    } else if (element instanceof Artifact) {
      const paths = task.readArtifactValue(element);
      resolved.push(...paths);
    } else if (isTarget(element)) {
      resolved.push(...collectTargetOutputs(element));
    } else {
      const paths = await element.resolve();
      resolved.push(...paths);
    }
  }

  return resolved;
}
