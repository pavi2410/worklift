/**
 * Core types for the Worklift build system
 */

/**
 * Task options that define inputs and outputs for incremental builds
 */
export interface TaskOptions {
  /** Input files or directories that this task depends on */
  inputs?: string | string[];
  /** Output files or directories that this task produces */
  outputs?: string | string[];
  /** Additional task metadata */
  [key: string]: any;
}

/**
 * A task is a function that performs a build operation
 */
export type TaskFn = () => void | Promise<void>;

/**
 * Task execution result
 */
export interface TaskResult {
  /** Whether the task was skipped due to up-to-date outputs */
  skipped: boolean;
  /** Error if the task failed */
  error?: Error;
}

/**
 * Dependency types:
 * - string: Target name within the same project
 * - Target: Direct target reference from any project
 * - Project: Depend on another project (executes all its dependencies)
 * - [Project, string]: Depend on a specific target in another project (legacy, use Target instead)
 */
export type Dependency = string | Target | Project | [Project, string];

/**
 * A target contains a set of tasks to execute
 */
export interface Target {
  /** Target name */
  name: string;
  /** Parent project (optional, for cross-project target references) */
  project?: Project;
  /** Dependencies on other targets, projects, or project:target combinations */
  dependencies: Dependency[];
  /** Tasks to execute for this target */
  tasks: TaskFn[];
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
  /** Get a target reference by name */
  target(name: string): Target;
  /** Define a new target (returns Project for chaining) */
  target(name: string, fn: () => void): Project;
  /** Define a new target with dependencies (returns Project for chaining) */
  target(name: string, dependencies: Dependency[], fn: () => void): Project;
  /** Execute a target by name */
  execute(targetName: string): Promise<void>;
  /** Add a project dependency */
  dependsOn(...projects: Project[]): void;
}

/**
 * Global registry of projects
 */
export const projects = new Map<string, Project>();

/**
 * Currently active target (for task registration)
 */
export let currentTarget: Target | null = null;

/**
 * Set the current target
 */
export function setCurrentTarget(target: Target | null) {
  currentTarget = target;
}

/**
 * Register a task with the current target
 */
export function registerTask(task: TaskFn) {
  if (!currentTarget) {
    throw new Error("Cannot register task: no active target");
  }
  currentTarget.tasks.push(task);
}
