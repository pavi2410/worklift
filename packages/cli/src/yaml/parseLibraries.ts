import { MAVEN_PRESETS, MAVEN_REPOS } from "./presets.ts";

export interface LibraryDef {
  preset?: string;
  coordinates?: string[];
  repositories?: string[];
}

export function parseLibraries(value: unknown): Map<string, LibraryDef> {
  const libraries = new Map<string, LibraryDef>();

  if (value === undefined) {
    return libraries;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("libraries must be an object");
  }

  for (const [name, def] of Object.entries(value as Record<string, unknown>)) {
    libraries.set(name, parseLibraryDef(name, def));
  }

  return libraries;
}

function parseLibraryDef(name: string, def: unknown): LibraryDef {
  if (typeof def === "string") {
    if (MAVEN_PRESETS[def]) {
      return { preset: def };
    }
    if (isCoordinate(def)) {
      return { coordinates: [def] };
    }
    throw new Error(
      `libraries.${name}: expected preset name or Maven coordinate, got: ${def}`
    );
  }

  if (Array.isArray(def)) {
    if (!def.every((item) => typeof item === "string" && isCoordinate(item))) {
      throw new Error(`libraries.${name} must be an array of Maven coordinates`);
    }
    return { coordinates: def };
  }

  if (typeof def === "object" && def !== null) {
    const obj = def as Record<string, unknown>;
    const preset = optionalString(obj, "preset");
    const coordinates = optionalStringArray(obj, "coordinates");
    const repositories = optionalStringArray(obj, "repositories");

    if (preset && !MAVEN_PRESETS[preset]) {
      throw new Error(`Unknown library preset: ${preset}`);
    }

    if (!preset && (!coordinates || coordinates.length === 0)) {
      throw new Error(
        `libraries.${name} requires preset or coordinates`
      );
    }

    return { preset, coordinates, repositories };
  }

  throw new Error(`libraries.${name} must be a string, array, or object`);
}

export function libraryResolveTargetName(libraryName: string): string {
  return `resolve-${libraryName}`;
}

function isCoordinate(value: string): boolean {
  return value.split(":").length === 3;
}

function optionalString(
  obj: Record<string, unknown>,
  key: string
): string | undefined {
  const value = obj[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`libraries.${key} must be a string`);
  }
  return value;
}

function optionalStringArray(
  obj: Record<string, unknown>,
  key: string
): string[] | undefined {
  const value = obj[key];
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`libraries.${key} must be an array of strings`);
  }
  return value;
}

export function resolveLibraryCoordinates(def: LibraryDef): string[] {
  if (def.preset) {
    return MAVEN_PRESETS[def.preset]!;
  }
  return def.coordinates ?? [];
}

export function resolveLibraryRepositories(def: LibraryDef): string[] | undefined {
  return def.repositories?.map((repo) => MAVEN_REPOS[repo] ?? repo);
}
