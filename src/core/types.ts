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
 * A target contains a set of tasks to execute
 */
export interface Target {
  /** Target name */
  name: string;
  /** Dependencies on other targets */
  dependencies: string[];
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
  /** Targets in this project */
  targets: Map<string, Target>;
  /** Define a new target */
  target(name: string, fn: () => void): void;
  /** Define a new target with dependencies */
  target(name: string, dependencies: string[], fn: () => void): void;
  /** Execute a target by name */
  execute(targetName: string): Promise<void>;
}

/**
 * Global registry of projects
 */
export const projects = new Map<string, Project>();

/**
 * Currently active project (for task registration)
 */
export let currentProject: Project | null = null;

/**
 * Set the current project
 */
export function setCurrentProject(project: Project | null) {
  currentProject = project;
}

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
