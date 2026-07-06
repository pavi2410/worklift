import type { Artifact } from "@worklift/core";
import type { FileSet } from "@worklift/core";
import { getProjectRegistry, isTarget, type Target } from "@worklift/core";
import { isFileSetDef, parseFileSet } from "./parseFileSet.ts";
import type { ResolvedVariant } from "./parseVariants.ts";

type ClasspathElement = string | string[] | Artifact<string[]> | FileSet | Target;

export function parseClasspath(
  value: unknown,
  artifacts: Map<string, Artifact<string[]>>,
  projectName: string,
  variants?: Map<string, ResolvedVariant>
): ClasspathElement[] {
  if (!value) {
    return [];
  }

  const items = Array.isArray(value) ? value : [value];
  return items.map((item) =>
    resolveClasspathElement(item, artifacts, projectName, variants)
  );
}

function resolveClasspathElement(
  item: unknown,
  artifacts: Map<string, Artifact<string[]>>,
  projectName: string,
  variants?: Map<string, ResolvedVariant>
): ClasspathElement {
  if (typeof item === "string") {
    if (item.startsWith("$")) {
      const name = item.slice(1);
      const artifact = artifacts.get(name);
      if (!artifact) {
        throw new Error(`Unknown artifact reference: ${item}`);
      }
      return artifact;
    }

    const target = resolveTargetClasspathRef(item, projectName);
    if (target) {
      return target;
    }

    if (variants?.has(item)) {
      return variants.get(item)!.output;
    }

    if (item.includes(":")) {
      throw new Error(`Unknown target classpath reference: ${item}`);
    }

    return item;
  }

  if (Array.isArray(item)) {
    return item.map((s) => {
      if (typeof s !== "string") {
        throw new Error("Classpath array must contain strings");
      }
      return s;
    });
  }

  if (isFileSetDef(item)) {
    return parseFileSet(item);
  }

  throw new Error(`Invalid classpath element: ${JSON.stringify(item)}`);
}

/**
 * Resolve `project:target` or a local target name to a Target reference.
 */
export function resolveTargetClasspathRef(
  ref: string,
  projectName: string
): Target | undefined {
  const colonCount = (ref.match(/:/g) ?? []).length;

  if (colonCount === 1) {
    const [refProject, targetName] = ref.split(":");
    if (!refProject || !targetName) {
      return undefined;
    }
    return findTarget(refProject, targetName);
  }

  if (colonCount === 0) {
    return findTarget(projectName, ref);
  }

  return undefined;
}

function findTarget(
  projectName: string,
  targetName: string
): Target | undefined {
  const registry = getProjectRegistry();
  const project = registry.get(projectName);
  return project?.targets.get(targetName);
}

export function resolveArtifactRef(
  value: unknown,
  artifacts: Map<string, Artifact<string[]>>
): Artifact<string[]> | undefined {
  if (typeof value !== "string" || !value.startsWith("$")) {
    return undefined;
  }
  const name = value.slice(1);
  const artifact = artifacts.get(name);
  if (!artifact) {
    throw new Error(`Unknown artifact reference: ${value}`);
  }
  return artifact;
}

/**
 * Returns true if a string is a target reference rather than a file path.
 */
export function isTargetClasspathRef(
  ref: string,
  projectName: string
): boolean {
  return resolveTargetClasspathRef(ref, projectName) !== undefined;
}
