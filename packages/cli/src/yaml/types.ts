/**
 * YAML build file schema types
 *
 * One file defines one project using a flat layout.
 */

export interface YamlBuildFile {
  imports?: string[];
  name?: string;
  baseDir?: string;
  artifacts?: Record<string, YamlArtifactDef>;
  dependencies?: Record<string, string | string[]>;
  targets?: Record<string, YamlTargetDef>;
}

export interface YamlArtifactDef {
  default?: unknown;
}

export interface YamlTargetDef {
  tasks?: YamlTaskDef[];
  clean?: string[];
}

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
  artifacts?: Record<string, YamlArtifactDef>;
  dependencies?: Record<string, string | string[]>;
  targets?: Record<string, YamlTargetDef>;
}
