/**
 * YAML build file schema types
 *
 * One file defines one project using a flat layout.
 */

import type { JvmConfig } from "./parseJvmConfig.ts";
import type { ResolvedVariant } from "./parseVariants.ts";

export interface YamlBuildFile {
  imports?: string[];
  name?: string;
  baseDir?: string;
  jvm?: YamlJvmConfig;
  java?: YamlJvmConfig;
  variants?: Record<string, YamlVariantDef>;
  artifacts?: Record<string, YamlArtifactDef>;
  dependencies?: Record<string, string | string[]>;
  clean?: string | string[];
  targets?: Record<string, YamlTargetInput>;
}

export interface YamlArtifactDef {
  default?: unknown;
}

export interface YamlJvmConfig {
  source?: string;
  target?: string;
  sourceVersion?: string;
  targetVersion?: string;
  encoding?: string;
  layout?: string;
  jdk?: string;
}

export interface YamlVariantDef {
  sources?: string;
  output?: string;
  classpath?: unknown;
  deps?: unknown;
}

/** Task list, legacy `{ tasks: [...] }`, or empty object for dependency-only targets */
export type YamlTargetInput =
  | YamlTaskDef[]
  | { tasks?: YamlTaskDef[] }
  | Record<string, never>;

/** A task is a single-key object: { copy: { ... } } */
export type YamlTaskDef = Record<string, Record<string, unknown>>;

export interface YamlFileSetDef {
  dir?: string;
  include?: string | string[];
  exclude?: string | string[];
  union?: YamlFileSetDef[];
}

export interface ParsedProjectDef {
  name: string;
  baseDir?: string;
  jvm?: JvmConfig;
  variants?: Map<string, ResolvedVariant>;
  artifacts?: Record<string, YamlArtifactDef>;
  dependencies?: Record<string, string | string[]>;
  clean?: string | string[];
  targets?: Record<string, YamlTargetInput>;
}
