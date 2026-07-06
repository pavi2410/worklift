/**
 * YAML build file schema types
 */

export interface YamlBuildFile {
  imports?: string[];
  artifacts?: Record<string, YamlArtifactDef>;
  projects?: Record<string, YamlProjectDef>;
}

export interface YamlArtifactDef {
  default?: unknown;
}

export interface YamlProjectDef {
  baseDir?: string;
  targets?: Record<string, YamlTargetDef>;
}

export interface YamlTargetDef {
  dependsOn?: string[];
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
