import { basename, dirname } from "path";
import type { ParsedProjectDef } from "./types.ts";

/**
 * Extract the single project defined in a build file.
 * Returns null for import-only files with no project content.
 */
export function parseProjectFromDoc(
  doc: Record<string, unknown>,
  filePath: string
): ParsedProjectDef | null {
  if (doc.targets === undefined) {
    return null;
  }

  return {
    name: resolveProjectName(doc, filePath),
    baseDir: doc.baseDir as string | undefined,
    artifacts: doc.artifacts as ParsedProjectDef["artifacts"],
    dependencies: doc.dependencies as ParsedProjectDef["dependencies"],
    clean: doc.clean as ParsedProjectDef["clean"],
    targets: doc.targets as ParsedProjectDef["targets"],
  };
}

/**
 * Resolve project name for flat build files.
 * 1. Explicit `name` field
 * 2. Parent directory when the file is build.yaml / build.yml
 * 3. Filename without extension
 */
export function resolveProjectName(
  doc: Record<string, unknown>,
  filePath: string
): string {
  if (typeof doc.name === "string" && doc.name.length > 0) {
    return doc.name;
  }

  const fileBase = basename(filePath).replace(/\.(yaml|yml)$/i, "");
  if (fileBase === "build") {
    return basename(dirname(filePath));
  }

  return fileBase;
}
