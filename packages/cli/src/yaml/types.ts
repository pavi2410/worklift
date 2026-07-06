/**
 * YAML build file schema types
 *
 * One file defines one project using a flat layout.
 */

import type { JavaDefaults } from "./parseJavaDefaults.ts";

export interface YamlBuildFile {
  imports?: string[];
  name?: string;
  baseDir?: string;
  java?: YamlJavaDefaults;
  artifacts?: Record<string, YamlArtifactDef>;
  dependencies?: Record<string, string | string[]>;
  clean?: string | string[];
  targets?: Record<string, YamlTargetInput>;
}

export interface YamlArtifactDef {
  default?: unknown;
}

export interface YamlJavaDefaults {
  source?: string;
  target?: string;
  sourceVersion?: string;
  targetVersion?: string;
  encoding?: string;
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
  java?: JavaDefaults;
  artifacts?: Record<string, YamlArtifactDef>;
  dependencies?: Record<string, string | string[]>;
  clean?: string | string[];
  targets?: Record<string, YamlTargetInput>;
}
