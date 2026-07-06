import type { Artifact } from "@worklift/core";
import type { FileSet } from "@worklift/core";
import { isFileSetDef, parseFileSet } from "./parseFileSet.ts";

type ClasspathElement = string | string[] | Artifact<string[]> | FileSet;

export function parseClasspath(
  value: unknown,
  artifacts: Map<string, Artifact<string[]>>
): ClasspathElement[] {
  if (!value) {
    return [];
  }

  const items = Array.isArray(value) ? value : [value];
  return items.map((item) => resolveClasspathElement(item, artifacts));
}

function resolveClasspathElement(
  item: unknown,
  artifacts: Map<string, Artifact<string[]>>
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
