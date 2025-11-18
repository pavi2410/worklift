/**
 * Core types for the Worklift build system
 */

import type { Task } from "./Task.ts";
import type { Artifact } from "./Artifact.ts";

/**
 * Dependency types:
 * - string: Target name within the same project
 * - Target: Direct target reference from any project
 * - Project: Depend on another project (executes all its dependencies)
 */
export type Dependency = string | Target | Project;

/**
 * A target contains a set of tasks to execute
 */
export interface Target {
  /** Target name */
  name: string;
  /** Parent project (optional, for cross-project target references) */
  project?: Project;
  /** Dependencies on other targets or projects */
  dependencies: Dependency[];
  /** Tasks to execute for this target */
  taskList: Task[];
  /** Artifacts produced by this target */
  producedArtifacts: Artifact[];
  /** Add dependencies to this target */
  dependsOn(...deps: Dependency[]): Target;
  /** Set tasks for this target */
  tasks(tasks: Task[]): Target;
  /** Declare artifacts that this target produces */
  produces(...artifacts: Artifact[]): Target;
  /** Execute the target */
  execute(): Promise<void>;
}

/**
 * A project contains multiple targets
 */
export interface Project {
  /** Project name */
  name: string;
  /** Dependencies on other projects */
  dependencies: Project[];
  /** Targets in this project */
  targets: Map<string, Target>;
  /** Create a new target */
  target(name: string): Target;
  /** Execute a target by name */
  execute(targetName: string): Promise<void>;
  /** Add project dependencies (returns this for chaining) */
  dependsOn(...projects: Project[]): Project;
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
