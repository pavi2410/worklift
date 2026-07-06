import type { Artifact } from "@worklift/core";
import type { Task } from "@worklift/core";
import {
  CopyTask,
  MoveTask,
  DeleteTask,
  MkdirTask,
  CreateFileTask,
  WriteFileTask,
  TemplateTask,
  ZipTask,
  UnzipTask,
  ExecTask,
} from "@worklift/file-tasks";
import {
  JavacTask,
  JarTask,
  JavaTask,
  JUnitTask,
  MavenDepTask,
  WarTask,
} from "@worklift/java-tasks";
import { MAVEN_PRESETS, MAVEN_REPOS } from "./presets.ts";
import type { TaskParseContext } from "./taskParseContext.ts";
import {
  parseClasspath,
  resolveArtifactRef,
} from "./parseClasspath.ts";
import {
  type ResolvedVariant,
} from "./parseVariants.ts";
import { isFileSetDef, parseFileSet } from "./parseFileSet.ts";
import type { YamlTaskDef } from "./types.ts";

const TASK_TYPES = new Set([
  "copy",
  "move",
  "delete",
  "mkdir",
  "create-file",
  "write-file",
  "template",
  "zip",
  "unzip",
  "exec",
  "javac",
  "jar",
  "java",
  "junit",
  "maven-dep",
  "war",
]);

export function parseTask(
  def: YamlTaskDef,
  ctx: TaskParseContext
): Task {
  const keys = Object.keys(def);
  if (keys.length !== 1) {
    throw new Error(
      `Task must be a single-key object (e.g. copy: {...}), got: ${JSON.stringify(def)}`
    );
  }

  const type = keys[0]!;
  const config = def[type]!;

  if (!TASK_TYPES.has(type)) {
    throw new Error(`Unknown task type: ${type}`);
  }

  switch (type) {
    case "copy":
      return parseCopyTask(config);
    case "move":
      return parseMoveTask(config);
    case "delete":
      return parseDeleteTask(config);
    case "mkdir":
      return MkdirTask.of({
        paths: requireStringArray(config, "paths"),
      });
    case "create-file":
      return CreateFileTask.of({
        path: requireString(config, "path"),
        content: requireString(config, "content"),
        encoding: optionalString(config, "encoding") as BufferEncoding | undefined,
      });
    case "write-file":
      return WriteFileTask.of({
        to: requireString(config, "to"),
        content: requireString(config, "content"),
        encoding: optionalString(config, "encoding") as BufferEncoding | undefined,
      });
    case "template":
      return TemplateTask.of({
        from: requireString(config, "from"),
        to: requireString(config, "to"),
        vars: optionalStringRecord(config, "vars"),
      });
    case "zip":
      return parseZipTask(config);
    case "unzip":
      return UnzipTask.of({
        file: requireString(config, "file"),
        to: requireString(config, "to"),
        overwrite: optionalBoolean(config, "overwrite"),
      });
    case "exec":
      return ExecTask.of({
        command: requireString(config, "command"),
        args: optionalStringArray(config, "args"),
        cwd: optionalString(config, "cwd"),
        env: optionalRecord(config, "env"),
      });
    case "javac":
      return parseJavacTask(config, ctx);
    case "jar":
      return parseJarTask(config);
    case "java":
      return JavaTask.of({
        mainClass: optionalString(config, "mainClass"),
        jar: optionalString(config, "jar"),
        classpath: parseClasspath(
          config.classpath,
          ctx.artifacts,
          ctx.projectName,
          ctx.variants
        ),
        jvmArgs: optionalStringArray(config, "jvmArgs"),
        args: optionalStringArray(config, "args"),
      });
    case "junit":
      return parseJUnitTask(config, ctx);
    case "maven-dep":
      return parseMavenDepTask(config, ctx.artifacts);
    case "war":
      return parseWarTask(config);
    default:
      throw new Error(`Unhandled task type: ${type}`);
  }
}

function parseJavacTask(config: unknown, ctx: TaskParseContext): JavacTask {
  if (typeof config === "string") {
    return javacFromVariant(requireVariant(config, ctx.variants), ctx, {});
  }

  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    throw new Error("javac config must be a variant name or object");
  }

  const obj = config as Record<string, unknown>;
  const variantName = optionalString(obj, "variant");
  const variant = variantName
    ? requireVariant(variantName, ctx.variants)
    : undefined;

  return javacFromVariant(variant, ctx, obj);
}

function javacFromVariant(
  variant: ResolvedVariant | undefined,
  ctx: TaskParseContext,
  overrides: Record<string, unknown>
): JavacTask {
  const sources =
    overrides.sources ?? (variant ? variant.sources : undefined);
  const destination =
    optionalString(overrides, "destination") ??
    (variant ? variant.output : undefined);
  const classpathSource =
    overrides.classpath ?? variant?.classpath;

  if (!sources) {
    throw new Error("javac: 'sources' is required");
  }
  if (!destination) {
    throw new Error("javac: 'destination' is required");
  }

  return JavacTask.of({
    sources: sources as string | string[],
    destination,
    classpath: parseClasspath(
      classpathSource,
      ctx.artifacts,
      ctx.projectName,
      ctx.variants
    ),
    sourceVersion:
      optionalString(overrides, "sourceVersion") ?? ctx.jvm?.sourceVersion,
    targetVersion:
      optionalString(overrides, "targetVersion") ?? ctx.jvm?.targetVersion,
    encoding: optionalString(overrides, "encoding") ?? ctx.jvm?.encoding,
  });
}

function parseJUnitTask(config: unknown, ctx: TaskParseContext): JUnitTask {
  if (typeof config === "string") {
    return junitFromVariant(requireVariant(config, ctx.variants), ctx, {});
  }

  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    throw new Error("junit config must be a variant name or object");
  }

  const obj = config as Record<string, unknown>;
  const testClassesRef = requireString(obj, "testClasses");
  const variant = ctx.variants.get(testClassesRef);
  const testClasses = variant?.output ?? testClassesRef;

  return JUnitTask.of({
    testClasses,
    classpath: parseClasspath(
      obj.classpath ?? variant?.classpath,
      ctx.artifacts,
      ctx.projectName,
      ctx.variants
    ),
    includes: optionalStringArray(obj, "includes"),
    excludes: optionalStringArray(obj, "excludes"),
    reports: optionalString(obj, "reports"),
    fork: optionalBoolean(obj, "fork"),
    jvmArgs: optionalStringArray(obj, "jvmArgs"),
    haltOnFailure: optionalBoolean(obj, "haltOnFailure"),
    version: obj.version as 4 | 5 | undefined,
  });
}

function junitFromVariant(
  variant: ResolvedVariant,
  ctx: TaskParseContext,
  overrides: Record<string, unknown>
): JUnitTask {
  return JUnitTask.of({
    testClasses: variant.output,
    classpath: parseClasspath(
      overrides.classpath ?? variant.classpath,
      ctx.artifacts,
      ctx.projectName,
      ctx.variants
    ),
    includes: optionalStringArray(overrides, "includes"),
    excludes: optionalStringArray(overrides, "excludes"),
    reports: optionalString(overrides, "reports"),
    fork: optionalBoolean(overrides, "fork"),
    jvmArgs: optionalStringArray(overrides, "jvmArgs"),
    haltOnFailure: optionalBoolean(overrides, "haltOnFailure"),
    version: overrides.version as 4 | 5 | undefined,
  });
}

function requireVariant(
  name: string,
  variants: Map<string, ResolvedVariant>
): ResolvedVariant {
  const variant = variants.get(name);
  if (!variant) {
    throw new Error(`Unknown variant: ${name}`);
  }
  return variant;
}

function parseCopyTask(config: Record<string, unknown>): CopyTask {
  const rename = config.rename as Record<string, string> | undefined;
  return CopyTask.of({
    from: optionalString(config, "from"),
    files: config.files ? parseFileSetOrString(config.files) : undefined,
    to: requireString(config, "to"),
    recursive: optionalBoolean(config, "recursive"),
    force: optionalBoolean(config, "force"),
    flatten: optionalBoolean(config, "flatten"),
    rename: rename
      ? {
          pattern: new RegExp(rename.pattern!),
          replacement: rename.replacement!,
        }
      : undefined,
  });
}

function parseMoveTask(config: Record<string, unknown>): MoveTask {
  return MoveTask.of({
    from: optionalString(config, "from"),
    files: config.files ? parseFileSetOrString(config.files) : undefined,
    to: requireString(config, "to"),
    flatten: optionalBoolean(config, "flatten"),
  });
}

function parseDeleteTask(config: Record<string, unknown>): DeleteTask {
  return DeleteTask.of({
    paths: optionalStringArray(config, "paths"),
    patterns: optionalStringArray(config, "patterns"),
    files: config.files ? parseFileSetOrString(config.files) : undefined,
    baseDir: optionalString(config, "baseDir"),
    recursive: optionalBoolean(config, "recursive"),
    includeDirs: optionalBoolean(config, "includeDirs"),
  });
}

function parseZipTask(config: Record<string, unknown>): ZipTask {
  return ZipTask.of({
    from: optionalString(config, "from"),
    files: config.files ? parseFileSetOrString(config.files) : undefined,
    to: requireString(config, "to"),
  });
}

function parseJarTask(config: Record<string, unknown>): JarTask {
  const include = config.include;
  return JarTask.of({
    from: requireString(config, "from"),
    to: requireString(config, "to"),
    mainClass: optionalString(config, "mainClass"),
    manifest: optionalString(config, "manifest"),
    include:
      typeof include === "string" || Array.isArray(include)
        ? include
        : include
          ? parseFileSetOrString(include)
          : undefined,
    excludeFromMerge: optionalStringArray(config, "excludeFromMerge"),
  });
}

function parseMavenDepTask(
  config: Record<string, unknown>,
  artifacts: Map<string, Artifact<string[]>>
): MavenDepTask {
  let coordinates: string[];

  if (config.preset) {
    const preset = requireString(config, "preset");
    const presetCoords = MAVEN_PRESETS[preset];
    if (!presetCoords) {
      throw new Error(`Unknown maven-dep preset: ${preset}`);
    }
    coordinates = presetCoords;
  } else {
    coordinates = requireStringArray(config, "coordinates");
  }

  const repos = optionalStringArray(config, "repositories");
  return MavenDepTask.of({
    coordinates,
    repositories: repos?.map((r) => MAVEN_REPOS[r] ?? r),
    into: resolveArtifactRef(config.into, artifacts),
  });
}

function parseWarTask(config: Record<string, unknown>): WarTask {
  const libs = config.libs;
  return WarTask.of({
    from: requireString(config, "from"),
    to: requireString(config, "to"),
    webXml: optionalString(config, "webXml"),
    classes: optionalString(config, "classes"),
    libs:
      typeof libs === "string" || Array.isArray(libs)
        ? libs
        : libs
          ? parseFileSetOrString(libs)
          : undefined,
    manifest: config.manifest as Record<string, string> | undefined,
  });
}

function parseFileSetOrString(value: unknown) {
  if (typeof value === "string") {
    return parseFileSet(value);
  }
  if (isFileSetDef(value)) {
    return parseFileSet(value);
  }
  throw new Error(`Invalid file set: ${JSON.stringify(value)}`);
}

function requireString(
  config: Record<string, unknown>,
  key: string
): string {
  const value = config[key];
  if (typeof value !== "string") {
    throw new Error(`Task config '${key}' must be a string`);
  }
  return value;
}

function optionalString(
  config: Record<string, unknown>,
  key: string
): string | undefined {
  const value = config[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new Error(`Task config '${key}' must be a string`);
  }
  return value;
}

function requireStringArray(
  config: Record<string, unknown>,
  key: string
): string[] {
  const value = config[key];
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
    throw new Error(`Task config '${key}' must be an array of strings`);
  }
  return value;
}

function optionalStringArray(
  config: Record<string, unknown>,
  key: string
): string[] | undefined {
  const value = config[key];
  if (value === undefined) return undefined;
  return requireStringArray(config, key);
}

function optionalBoolean(
  config: Record<string, unknown>,
  key: string
): boolean | undefined {
  const value = config[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new Error(`Task config '${key}' must be a boolean`);
  }
  return value;
}

function optionalRecord(
  config: Record<string, unknown>,
  key: string
): Record<string, string> | undefined {
  const value = config[key];
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Task config '${key}' must be an object`);
  }
  return value as Record<string, string>;
}

function optionalStringRecord(
  config: Record<string, unknown>,
  key: string
): Record<string, string> | undefined {
  const value = optionalRecord(config, key);
  if (value === undefined) return undefined;
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (typeof entryValue !== "string") {
      throw new Error(`Task config '${key}.${entryKey}' must be a string`);
    }
  }
  return value;
}
