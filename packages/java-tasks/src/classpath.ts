import {
  Artifact,
  FileSet,
  collectTargetOutputs,
  isTarget,
  type Target,
  type Task,
} from "@worklift/core";

export type ClasspathElement =
  | string
  | string[]
  | Artifact<string[]>
  | FileSet
  | Target;

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
      task.registerOutputTargetDependency(element);
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
