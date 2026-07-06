import { FileSet } from "@worklift/core";
import type { YamlFileSetDef } from "./types.ts";

export function parseFileSet(def: YamlFileSetDef | string): FileSet {
  if (typeof def === "string") {
    return FileSet.dir(def);
  }

  if (def.union) {
    const sets = def.union.map((item) => parseFileSet(item));
    return FileSet.union(...sets);
  }

  const dir = def.dir ?? ".";
  let fileSet = FileSet.dir(dir);

  if (def.include) {
    const patterns = Array.isArray(def.include) ? def.include : [def.include];
    fileSet = fileSet.include(...patterns);
  }

  if (def.exclude) {
    const patterns = Array.isArray(def.exclude) ? def.exclude : [def.exclude];
    fileSet = fileSet.exclude(...patterns);
  }

  return fileSet;
}

export function isFileSetDef(value: unknown): value is YamlFileSetDef {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    "dir" in obj ||
    "include" in obj ||
    "exclude" in obj ||
    "union" in obj
  );
}
