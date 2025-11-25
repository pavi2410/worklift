/**
 * Core types for the Worklift build system
 */

import type { Task } from "./Task.ts";
import type { Artifact } from "./Artifact.ts";

/**
 * Configuration for creating a target
 */
export interface TargetConfig {
  /** Target name */
  name: string;
  /** Dependencies on other targets */
  dependsOn?: Dependency[];
  /** Tasks to execute for this target */
  tasks?: Task[];
  /** Artifacts produced by this target */
  produces?: Artifact[];
}

/**
 * Dependency types:
 * - string: Target name within the same project
 * - Target: Direct target reference from any project
 */
export type Dependency = string | Target;

/**
 * A target contains a set of tasks to execute
 */
export interface Target {
  /** Target name */
  name: string;
  /** Parent project (optional, for cross-project target references) */
  project?: Project;
  /** Dependencies on other targets */
  dependencies: Dependency[];
  /** Tasks to execute for this target */
  taskList: Task[];
  /** Artifacts produced by this target */
  producedArtifacts: Artifact[];
  /** Execute the target */
  execute(): Promise<void>;
}

/**
 * A project contains multiple targets
 */
export interface Project {
  /** Project name */
  name: string;
  /** Base directory for this project (for resolving relative paths) */
  baseDir?: string;
  /** Targets in this project */
  targets: Map<string, Target>;
  /** Create a new target */
  target(config: TargetConfig): Target;
  /** Execute a target by name */
  execute(targetName: string): Promise<void>;
}

/**
 * Global registry of projects
 */
export const projects = new Map<string, Project>();

/**
 * Get the global project registry
 */
export function getProjectRegistry(): Map<string, Project> {
  return projects;
}
